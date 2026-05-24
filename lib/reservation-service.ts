import { Prisma, type ReservationStatus } from "@prisma/client"

import { ConflictError, GoneError, NotFoundError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"

/** Reservation TTL (milliseconds) — how long a reservation remains PENDING before expiring */
export const RESERVATION_TTL_MS = 10 * 60 * 1000

/**
 * Types used for raw SELECT ... FOR UPDATE queries. We fetch the minimal set
 * of columns required to make decisions inside a transaction.
 */
type ReservationRow = {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  status: ReservationStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

type InventoryRow = {
  id: string
  productId: string
  warehouseId: string
  totalQuantity: number
  reservedQuantity: number
  updatedAt: Date
}

const reservationRelationsInclude = {
  product: true,
  warehouse: true,
} as const

const isReservationDebugEnabled =
  process.env.NODE_ENV !== "production" && process.env.RESERVATION_DEBUG === "true"

function logReservationEvent(message: string, details?: Record<string, unknown>) {
  if (!isReservationDebugEnabled) {
    return
  }

  if (details) {
    console.info(`[reservation] ${message}`, details)
    return
  }

  console.info(`[reservation] ${message}`)
}

function isExpired(reservation: Pick<ReservationRow, "expiresAt">, now: Date) {
  return reservation.expiresAt.getTime() <= now.getTime()
}

/**
 * Lock the inventory row for the given product+warehouse inside the provided
 * transaction. We use a raw SELECT ... FOR UPDATE to ensure the database
 * acquires a row-level lock which serializes concurrent transactions trying
 * to adjust the same inventory row.
 */
async function lockInventoryRow(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
) {
  const rows = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
    SELECT "id", "productId", "warehouseId", "totalQuantity", "reservedQuantity", "updatedAt"
    FROM "Inventory"
    WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
    FOR UPDATE
  `)

  return rows[0] ?? null
}

/**
 * Lock the reservation row by id inside the transaction so that confirm/release
 * operations are serialized when modifying reservation status and inventory.
 */
async function lockReservationRow(tx: Prisma.TransactionClient, reservationId: string) {
  const rows = await tx.$queryRaw<ReservationRow[]>(Prisma.sql`
    SELECT "id", "productId", "warehouseId", "quantity", "status", "expiresAt", "createdAt", "updatedAt"
    FROM "Reservation"
    WHERE "id" = ${reservationId}
    FOR UPDATE
  `)

  return rows[0] ?? null
}

/**
 * Ensure the inventory row exists and is locked inside the transaction.
 * If it does not exist we throw 404 — caller will map to an HTTP response.
 */
async function ensureInventoryRow(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
) {
  const inventory = await lockInventoryRow(tx, productId, warehouseId)

  if (!inventory) {
    throw new NotFoundError("Inventory record not found")
  }

  return inventory
}

/**
 * Helper used when a reservation is released: decrement reservedQuantity and
 * mark reservation as RELEASED in the same transaction.
 */
async function releaseInventoryForReservation(
  tx: Prisma.TransactionClient,
  reservation: ReservationRow,
) {
  const inventory = await ensureInventoryRow(tx, reservation.productId, reservation.warehouseId)

  // Decrement reservedQuantity — keep totalQuantity unchanged (release only)
  await tx.inventory.update({
    where: { id: inventory.id },
    data: {
      reservedQuantity: {
        decrement: reservation.quantity,
      },
    },
  })

  return tx.reservation.update({
    where: { id: reservation.id },
    data: { status: "RELEASED" },
    include: reservationRelationsInclude,
  })
}

/**
 * Basic assertion about whether an action can be performed on a reservation.
 * Throws domain-specific errors that are mapped to HTTP status codes by the
 * API layer.
 */
function assertActionAllowed(reservation: ReservationRow, now: Date) {
  if (reservation.status === "CONFIRMED") {
    throw new ConflictError("Reservation has already been confirmed")
  }

  if (reservation.status === "RELEASED") {
    if (isExpired(reservation, now)) {
      // If the reservation was already released and expired, surface 410
      throw new GoneError("Reservation has expired")
    }

    throw new ConflictError("Reservation has already been released")
  }
}

/**
 * Reserve inventory (create a PENDING reservation).
 *
 * Guarantees:
 * - Executes inside the provided transaction `tx`.
 * - Locks the inventory row using SELECT ... FOR UPDATE to serialize
 *   concurrent reservations for the same product+warehouse.
 * - Computes available stock inside the transaction and fails with 409 when
 *   insufficient.
 */
export async function reserveInventory(
  tx: Prisma.TransactionClient,
  input: {
    productId: string
    warehouseId: string
    quantity: number
    now?: Date
  },
) {
  const now = input.now ?? new Date()

  // Lock inventory row and read current totals inside the transaction.
  const inventory = await ensureInventoryRow(tx, input.productId, input.warehouseId)

  logReservationEvent("inventory lock acquired", {
    productId: input.productId,
    warehouseId: input.warehouseId,
    inventoryId: inventory.id,
  })

  const availableStock = inventory.totalQuantity - inventory.reservedQuantity

  logReservationEvent("available stock checked", {
    productId: input.productId,
    warehouseId: input.warehouseId,
    inventoryId: inventory.id,
    totalQuantity: inventory.totalQuantity,
    reservedQuantity: inventory.reservedQuantity,
    availableStock,
    requestedQuantity: input.quantity,
  })

  if (availableStock < input.quantity) {
    logReservationEvent("reservation rejected: insufficient stock", {
      productId: input.productId,
      warehouseId: input.warehouseId,
      availableStock,
      requestedQuantity: input.quantity,
    })

    // Insufficient stock — throw a domain error mapped to HTTP 409
    throw new ConflictError("Insufficient stock")
  }

  // Increase reservedQuantity and create a PENDING reservation in the same tx.
  // The guarded raw UPDATE makes the stock increment atomic even if the row is
  // contended, while the prior SELECT ... FOR UPDATE guarantees serialization.
  const updatedInventoryRows = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
    UPDATE "Inventory"
    SET "reservedQuantity" = "reservedQuantity" + ${input.quantity},
        "updatedAt" = NOW()
    WHERE "id" = ${inventory.id}
      AND ("totalQuantity" - "reservedQuantity") >= ${input.quantity}
    RETURNING "id", "productId", "warehouseId", "totalQuantity", "reservedQuantity", "updatedAt"
  `)

  const updatedInventory = updatedInventoryRows[0]

  if (!updatedInventory) {
    logReservationEvent("reservation rejected during stock update", {
      productId: input.productId,
      warehouseId: input.warehouseId,
      inventoryId: inventory.id,
      availableStock,
      requestedQuantity: input.quantity,
    })

    throw new ConflictError("Insufficient stock")
  }

  const reservation = await tx.reservation.create({
    data: {
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      status: "PENDING",
      expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS),
    },
    include: reservationRelationsInclude,
  })

  logReservationEvent("reservation created successfully", {
    reservationId: reservation.id,
    productId: input.productId,
    warehouseId: input.warehouseId,
    requestedQuantity: input.quantity,
    reservedQuantity: updatedInventory.reservedQuantity,
  })

  return reservation
}

/**
 * Confirm a reservation: move stock from reserved to consumed (decrement both
 * reservedQuantity and totalQuantity), and set reservation status to CONFIRMED.
 *
 * The function locks the reservation row and the corresponding inventory row
 * inside the same transaction to avoid races with other concurrent confirms
 * or releases.
 */
export async function confirmReservation(
  tx: Prisma.TransactionClient,
  reservationId: string,
  now = new Date(),
) {
  const reservation = await lockReservationRow(tx, reservationId)

  if (!reservation) {
    throw new NotFoundError("Reservation not found")
  }

  // If the reservation has expired, release it and surface 410
  if (reservation.status === "PENDING" && isExpired(reservation, now)) {
    await releaseInventoryForReservation(tx, reservation)
    throw new GoneError("Reservation has expired")
  }

  assertActionAllowed(reservation, now)

  const inventory = await ensureInventoryRow(tx, reservation.productId, reservation.warehouseId)

  // Sanity check: reservedQuantity must be enough to cover this reservation
  if (inventory.reservedQuantity < reservation.quantity) {
    throw new ConflictError("Reservation stock is no longer available")
  }

  // Decrement reservedQuantity and totalQuantity atomically inside tx
  await tx.inventory.update({
    where: { id: inventory.id },
    data: {
      reservedQuantity: {
        decrement: reservation.quantity,
      },
      totalQuantity: {
        decrement: reservation.quantity,
      },
    },
  })

  return tx.reservation.update({
    where: { id: reservation.id },
    data: { status: "CONFIRMED" },
    include: reservationRelationsInclude,
  })
}

/**
 * Release a reservation: decrement reservedQuantity and mark reservation as
 * RELEASED. Handles expiration as well — if reservation already expired we
 * release and surface 410.
 */
export async function releaseReservation(
  tx: Prisma.TransactionClient,
  reservationId: string,
  now = new Date(),
) {
  const reservation = await lockReservationRow(tx, reservationId)

  if (!reservation) {
    throw new NotFoundError("Reservation not found")
  }

  if (reservation.status === "PENDING" && isExpired(reservation, now)) {
    await releaseInventoryForReservation(tx, reservation)
    throw new GoneError("Reservation has expired")
  }

  assertActionAllowed(reservation, now)

  return releaseInventoryForReservation(tx, reservation)
}

/**
 * Lazy expiration helper used by fetch paths: if a reservation is already
 * expired, release it transactionally and return a marker instead of throwing.
 * This lets the transaction commit the release while the API can still reply
 * with HTTP 410.
 */
export async function releaseExpiredReservationIfNeeded(
  tx: Prisma.TransactionClient,
  reservationId: string,
  now = new Date(),
) {
  const reservation = await lockReservationRow(tx, reservationId)

  if (!reservation) {
    throw new NotFoundError("Reservation not found")
  }

  if (reservation.status !== "PENDING" || !isExpired(reservation, now)) {
    return { released: false as const, reservation }
  }

  const releasedReservation = await releaseInventoryForReservation(tx, reservation)

  return { released: true as const, reservation: releasedReservation }
}

/**
 * Find expired PENDING reservations and release them in batches. Uses
 * SELECT ... FOR UPDATE SKIP LOCKED to avoid contending with other workers.
 * Each expired reservation is released in the same transaction so inventory
 * accounting remains consistent.
 */
export async function releaseExpiredReservations(tx: Prisma.TransactionClient, now = new Date()) {
  const expiredReservations = await tx.$queryRaw<ReservationRow[]>(Prisma.sql`
    SELECT "id", "productId", "warehouseId", "quantity", "status", "expiresAt", "createdAt", "updatedAt"
    FROM "Reservation"
    WHERE "status" = 'PENDING' AND "expiresAt" <= ${now}
    ORDER BY "expiresAt" ASC
    FOR UPDATE SKIP LOCKED
  `)

  let releasedCount = 0

  for (const reservation of expiredReservations) {
    await releaseInventoryForReservation(tx, reservation)
    releasedCount += 1
  }

  return { releasedCount }
}

export async function getProductsWithStock() {
  return prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      inventory: {
        orderBy: { updatedAt: "asc" },
        include: {
          warehouse: true,
        },
      },
    },
  })
}
