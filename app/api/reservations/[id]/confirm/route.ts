import { NextResponse } from "next/server"

import { handleApiError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { confirmReservation } from "@/lib/reservation-service"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const reservation = await prisma.$transaction((tx) => confirmReservation(tx, id), {
      maxWait: 10000,
      timeout: 20000,
    })

    return NextResponse.json({ reservation })
  } catch (error) {
    return handleApiError(error)
  }
}
