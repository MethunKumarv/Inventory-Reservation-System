import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { releaseExpiredReservations } from "@/lib/reservation-service"

export const runtime = "nodejs"

export async function POST() {
  const result = await prisma.$transaction((tx) => releaseExpiredReservations(tx), {
    maxWait: 10000,
    timeout: 20000,
  })

  return NextResponse.json(result)
}
