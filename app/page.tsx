import { Suspense } from "react"
import Link from "next/link"

import { ProductListClient } from "@/components/product-list-client"
import { SkeletonGrid } from "@/components/skeleton-grid"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function Home() {
  const products = await prisma.product.findMany({
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

  const initialProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    warehouses: product.inventory
      .map((inventory) => ({
        warehouseId: inventory.warehouseId,
        warehouseName: inventory.warehouse.name,
        totalQuantity: inventory.totalQuantity,
        reservedQuantity: inventory.reservedQuantity,
        availableStock: inventory.totalQuantity - inventory.reservedQuantity,
      }))
      .sort((left, right) => left.warehouseName.localeCompare(right.warehouseName)),
  }))

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-3">
          <Link
            href="/"
            aria-label="Go to the landing page"
            className="inline-flex rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-400/15 via-emerald-400/15 to-blue-400/15 px-3 py-1 text-sm uppercase tracking-[0.3em] text-cyan-100 shadow-sm shadow-cyan-950/20 transition hover:scale-[1.01] hover:border-cyan-200/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
          >
            Inventory Reservation System
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Reserve stock safely while checkout is in progress.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Product availability is computed from live warehouse inventory. Reservations hold stock for 10 minutes, then release automatically if the purchase is not completed.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-white/65 sm:grid-cols-3 md:min-w-[30rem] md:w-[32rem] lg:w-[34rem]">
          <div className="flex h-full min-h-[7.5rem] flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition-all duration-200 ease-out supports-[hover:hover]:hover:-translate-y-0.5 supports-[hover:hover]:hover:border-white/18 supports-[hover:hover]:hover:bg-black/28">
            <div className="w-full text-center text-xs uppercase tracking-[0.24em] text-white/45">
              Products
            </div>
            <div className="w-full text-center text-2xl font-semibold leading-none text-white">{products.length}</div>
          </div>
          <div className="flex h-full min-h-[7.5rem] flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition-all duration-200 ease-out supports-[hover:hover]:hover:-translate-y-0.5 supports-[hover:hover]:hover:border-white/18 supports-[hover:hover]:hover:bg-black/28">
            <div className="w-full text-center text-xs uppercase tracking-[0.24em] text-white/45">
              Warehouses
            </div>
            <div className="w-full text-center text-2xl font-semibold leading-none text-white">
              {new Set(products.flatMap((product) => product.inventory.map((entry) => entry.warehouseId))).size}
            </div>
          </div>
          <div className="flex h-full min-h-[7.5rem] flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition-all duration-200 ease-out supports-[hover:hover]:hover:-translate-y-0.5 supports-[hover:hover]:hover:border-white/18 supports-[hover:hover]:hover:bg-black/28">
            <div className="w-full text-center text-xs uppercase tracking-[0.24em] text-white/45">
              Inventory Rows
            </div>
            <div className="w-full text-center text-2xl font-semibold leading-none text-white">
              {products.reduce((count, product) => count + product.inventory.length, 0)}
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<SkeletonGrid />}>
        <ProductListClient initialProducts={initialProducts} />
      </Suspense>
    </main>
  )
}
