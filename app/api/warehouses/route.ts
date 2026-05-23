import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ warehouses })
}
