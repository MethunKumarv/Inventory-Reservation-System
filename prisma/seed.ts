import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed script")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const warehouses = [
  { name: "Mumbai Fulfillment Center" },
  { name: "Delhi Distribution Hub" },
  { name: "Bengaluru Overflow Warehouse" },
]

const products = [
  {
    name: "Wireless Headphones",
    description: "Noise-cancelling over-ear headphones for focus and travel.",
  },
  {
    name: "Mechanical Keyboard",
    description: "Compact mechanical keyboard with hot-swappable switches.",
  },
  {
    name: "USB-C Dock",
    description: "Multi-port USB-C dock for laptop productivity setups.",
  },
  {
    name: "4K Webcam",
    description: "High-resolution webcam for calls, streaming, and demos.",
  },
  {
    name: "Portable Monitor",
    description: "Slim portable display for travel and dual-screen workflows.",
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable Bluetooth speaker with rich bass and long battery life.",
  },
]

const inventoryByWarehouse = [
  [14, 10, 8, 6, 5, 13],
  [9, 12, 7, 8, 4, 10],
  [6, 5, 11, 4, 9, 7],
]

async function main() {
  await prisma.reservation.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()

  const createdWarehouses: Array<{ id: string; name: string }> = []
  for (const warehouse of warehouses) {
    const created = await prisma.warehouse.create({ data: warehouse })
    createdWarehouses.push(created)
  }

  const createdProducts: Array<{ id: string; name: string }> = []
  for (const product of products) {
    const created = await prisma.product.create({ data: product })
    createdProducts.push(created)
  }

  for (let warehouseIndex = 0; warehouseIndex < createdWarehouses.length; warehouseIndex += 1) {
    const warehouse = createdWarehouses[warehouseIndex]

    for (let productIndex = 0; productIndex < createdProducts.length; productIndex += 1) {
      const product = createdProducts[productIndex]
      const totalQuantity = inventoryByWarehouse[warehouseIndex]?.[productIndex] ?? 0

      await prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalQuantity,
          reservedQuantity: 0,
        },
      })
    }
  }

  console.log(`Seed completed: ${createdProducts.length} products, ${createdWarehouses.length} warehouses, and inventory records created.`)
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })