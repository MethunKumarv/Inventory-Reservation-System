import { notFound } from "next/navigation"
import Link from "next/link"

import { ReservationPageClient } from "@/components/reservation-page-client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type ReservationPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ resumed?: string | string[] }>
}

export default async function ReservationPage({ params, searchParams }: ReservationPageProps) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const resumed = resolvedSearchParams.resumed === "1"

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  })

  if (!reservation) {
    notFound()
  }

  const inventory = await prisma.inventory.findUnique({
    where: {
      productId_warehouseId: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
    },
  })

  if (!inventory) {
    notFound()
  }

  const renderedAt = new Date()
  const initialExpired = reservation.status === "PENDING" && reservation.expiresAt <= new Date()
  const initialRemainingMs = reservation.expiresAt.getTime() - renderedAt.getTime()

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white">
          <span aria-hidden="true">←</span>
          <span>Back to products</span>
        </Link>
      </div>

      <ReservationPageClient
        reservation={{
          id: reservation.id,
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
          quantity: reservation.quantity,
          status: reservation.status,
          expiresAt: reservation.expiresAt.toISOString(),
          createdAt: reservation.createdAt.toISOString(),
          updatedAt: reservation.updatedAt.toISOString(),
          product: {
            id: reservation.product.id,
            name: reservation.product.name,
            description: reservation.product.description,
          },
          warehouse: {
            id: reservation.warehouse.id,
            name: reservation.warehouse.name,
          },
        }}
        inventory={{
          totalQuantity: inventory.totalQuantity,
          reservedQuantity: inventory.reservedQuantity,
        }}
        initialRemainingMs={initialRemainingMs}
        initialExpired={initialExpired}
        showResumeNotice={resumed}
      />
    </main>
  )
}