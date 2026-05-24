import { NextResponse } from "next/server"

import { parseJsonBody, handleApiError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { createReservationSchema } from "@/schemas/reservation"
import { reserveInventory } from "@/lib/reservation-service"

export const runtime = "nodejs"

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: true, warehouse: true },
  })

  return NextResponse.json({ reservations })
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, createReservationSchema)

    const reservation = await prisma.$transaction(
      (tx) => reserveInventory(tx, payload),
      {
        maxWait: 10000,
        timeout: 20000,
      },
    )

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.warn("[reservation] transaction failed", error)
    return handleApiError(error)
  }
}
