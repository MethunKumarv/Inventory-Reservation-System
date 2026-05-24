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
        <div className="grid gap-3 text-sm text-white/65 lg:grid-cols-3 lg:min-w-[34rem] lg:w-[34rem]">
          <div className="flex h-full min-h-[5.75rem] flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-2.5 transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-white/18 hover:bg-black/28 hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] sm:min-h-[7.5rem] sm:p-4">
            <div className="w-full text-center text-[0.56rem] font-medium uppercase leading-tight tracking-[0.06em] text-white/50 sm:text-xs sm:leading-4 sm:tracking-[0.24em]">
              Products
            </div>
            <div className="w-full text-center text-xl font-semibold leading-none text-white sm:text-2xl">{products.length}</div>
          </div>
          <div className="flex h-full min-h-[5.75rem] flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-2.5 transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-white/18 hover:bg-black/28 hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] sm:min-h-[7.5rem] sm:p-4">
            <div className="w-full text-center text-[0.56rem] font-medium uppercase leading-tight tracking-[0.06em] text-white/50 sm:text-xs sm:leading-4 sm:tracking-[0.24em]">
              Warehouses
            </div>
            <div className="w-full text-center text-xl font-semibold leading-none text-white sm:text-2xl">
              {new Set(products.flatMap((product) => product.inventory.map((entry) => entry.warehouseId))).size}
            </div>
          </div>
          <div className="flex h-full min-h-[5.75rem] flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-2.5 transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-white/18 hover:bg-black/28 hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] sm:min-h-[7.5rem] sm:p-4">
            <div className="w-full text-center text-[0.56rem] font-medium uppercase leading-tight tracking-[0.06em] text-white/50 sm:text-xs sm:leading-4 sm:tracking-[0.24em]">
              Inventory Rows
            </div>
            <div className="w-full text-center text-xl font-semibold leading-none text-white sm:text-2xl">
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
