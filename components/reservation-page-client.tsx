"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CountdownTimer } from "@/components/countdown-timer"
import { ReservationStatusBadge } from "@/components/reservation-status-badge"
import { StockBadge } from "@/components/stock-badge"
import { Alert } from "@/components/alert"

type ReservationPageClientProps = {
  reservation: {
    id: string
    productId: string
    warehouseId: string
    quantity: number
    status: "PENDING" | "CONFIRMED" | "RELEASED"
    expiresAt: string
    createdAt: string
    updatedAt: string
    product: {
      id: string
      name: string
      description: string
    }
    warehouse: {
      id: string
      name: string
    }
  }
  inventory: {
    totalQuantity: number
    reservedQuantity: number
  }
  initialRemainingMs: number
  initialExpired: boolean
  showResumeNotice?: boolean
}

type ReservationResponse = {
  reservation?: ReservationPageClientProps["reservation"]
  error?: string
}

function getReservationStorageKey(productId: string, warehouseId: string) {
  return `reservation:${productId}:${warehouseId}`
}

export function ReservationPageClient({
  reservation: initialReservation,
  inventory,
  initialRemainingMs,
  initialExpired,
  showResumeNotice = false,
}: ReservationPageClientProps) {
  const [reservation, setReservation] = useState(initialReservation)
  const [inventoryState, setInventoryState] = useState(inventory)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(initialExpired)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const availableStock = useMemo(
    () => inventoryState.totalQuantity - inventoryState.reservedQuantity,
    [inventoryState],
  )

  const isEffectivelyExpired = isExpired

  useEffect(() => {
    const storageKey = getReservationStorageKey(reservation.productId, reservation.warehouseId)

    if (reservation.status === "PENDING") {
      window.localStorage.setItem(storageKey, reservation.id)
      return
    }

    window.localStorage.removeItem(storageKey)
  }, [reservation.id, reservation.productId, reservation.status, reservation.warehouseId])

  async function runAction(path: "confirm" | "release") {
    setServerError(null)
    setSuccessMessage(null)

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/${path}`, {
        method: "POST",
      })

      const payload = (await response.json().catch(() => null)) as ReservationResponse | null

      if (!response.ok) {
        // handle 410 expiration explicitly
        if (response.status === 410) {
          setServerError(payload?.error ?? "Reservation expired")
        } else {
          setServerError(payload?.error ?? "Unable to update reservation.")
        }

        return
      }

      if (payload?.reservation) {
        setReservation(payload.reservation)
        setInventoryState((current) => ({
          totalQuantity: path === "confirm" ? current.totalQuantity - reservation.quantity : current.totalQuantity,
          reservedQuantity: current.reservedQuantity - reservation.quantity,
        }))

        setSuccessMessage(path === "confirm" ? "Purchase confirmed" : "Reservation cancelled")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Poll reservation status in background while pending
  useEffect(() => {
    let mounted = true

    if (reservation.status !== "PENDING") return

    const id = reservation.id
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reservations/${id}`, { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json().catch(() => null)
        if (!mounted || !json?.reservation) return
        setReservation(json.reservation)
        if (json.reservation.status !== "PENDING") {
          clearInterval(interval)
        }
      } catch {
        // ignore polling errors
      }
    }, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [reservation.id, reservation.status])

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Reservation Details</CardTitle>
            <CardDescription className="space-y-1">
              <span className="block">ID: {reservation.id}</span>
              <span className="block">{reservation.product.name} reserved at {reservation.warehouse.name}</span>
            </CardDescription>
          </div>
          <ReservationStatusBadge status={reservation.status} expired={isEffectivelyExpired} />
        </div>
      </CardHeader>

      <CardContent>
        {showResumeNotice && reservation.status === "PENDING" ? (
          <Alert variant="info" className="mb-4 border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-50">
            You already have this reservation in progress. Please confirm or cancel it before reserving again.
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">Product</div>
            <div className="mt-1 text-lg font-semibold">{reservation.product.name}</div>
            <div className="mt-2 text-sm text-white/65">{reservation.product.description}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">Quantity</div>
            <div className="mt-1 text-3xl font-semibold">{reservation.quantity}</div>
            <div className="mt-2 text-sm text-white/65">Held from stock in {reservation.warehouse.name}</div>
          </div>

          <div className="space-y-3">
            {reservation.status === "PENDING" ? (
              <CountdownTimer
                expiresAt={reservation.expiresAt}
                initialRemainingMs={initialRemainingMs}
                onExpired={() => setIsExpired(true)}
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.24em] text-white/50">Timer</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {reservation.status === "CONFIRMED" ? "Purchase completed" : "Reservation closed"}
                </div>
              </div>
            )}
            <StockBadge availableStock={availableStock} totalQuantity={inventory.totalQuantity} />
          </div>
        </div>

        {isEffectivelyExpired && reservation.status === "PENDING" ? (
          <Alert
            variant="error"
            className="mt-4 border-rose-400/50 bg-rose-500/10 p-5 text-base shadow-lg shadow-rose-950/20"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-400/15 text-rose-200">
                !
              </div>
              <div className="min-w-0">
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rose-200/80">
                  Reservation expired
                </div>
                <div className="mt-1 text-lg font-semibold text-white">This reservation has expired</div>
                <div className="mt-1 text-sm text-rose-100/75">
                  The reserved stock is being released back to inventory.
                </div>
              </div>
            </div>
          </Alert>
        ) : null}

        {serverError ? <Alert variant="error" className="mt-4">{serverError}</Alert> : null}

        {successMessage ? (
          <Alert
            variant="success"
            className="mt-4 border-emerald-400/50 bg-emerald-500/10 p-5 text-base shadow-lg shadow-emerald-950/20"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200">
                ✓
              </div>
              <div className="min-w-0">
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-200/80">
                  Action complete
                </div>
                <div className="mt-1 text-lg font-semibold text-white">{successMessage}</div>
                <div className="mt-1 text-sm text-emerald-100/75">
                  The reservation has been updated and the inventory state has been synced.
                </div>
              </div>
            </div>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter>
        <Button onClick={() => runAction("confirm")} disabled={isSubmitting || reservation.status !== "PENDING" || isEffectivelyExpired}>
          {isSubmitting ? "Processing..." : "Confirm Purchase"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => runAction("release")}
          disabled={isSubmitting || reservation.status !== "PENDING" || isEffectivelyExpired}
        >
          Cancel
        </Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
        >
          Go Home
        </Link>
      </CardFooter>
    </Card>
  )
}
