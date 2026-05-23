import { NextResponse } from "next/server"

import { handleApiError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { releaseExpiredReservationIfNeeded } from "@/lib/reservation-service"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    // Lazy expiration check: if the reservation is still pending but expired,
    // release it transactionally and still report 410 to the caller.
    if (reservation.status === "PENDING" && reservation.expiresAt <= new Date()) {
      await prisma.$transaction((tx) => releaseExpiredReservationIfNeeded(tx, id), {
        maxWait: 10000,
        timeout: 20000,
      })
      return NextResponse.json({ error: "Reservation has expired" }, { status: 410 })
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    return handleApiError(error)
  }
}
