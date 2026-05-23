import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      inventory: {
        orderBy: { updatedAt: "asc" },
        include: { warehouse: true },
      },
    },
  })

  return NextResponse.json({
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      createdAt: product.createdAt,
      warehouses: product.inventory
        .map((inventory) => ({
          warehouseId: inventory.warehouseId,
          warehouseName: inventory.warehouse.name,
          totalQuantity: inventory.totalQuantity,
          reservedQuantity: inventory.reservedQuantity,
          availableStock: inventory.totalQuantity - inventory.reservedQuantity,
        }))
        .sort((left, right) => left.warehouseName.localeCompare(right.warehouseName)),
    })),
  })
}
