"use client"

import { memo, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageTransitionLoader } from "@/components/page-transition-loader"
import { StockBadge } from "@/components/stock-badge"

type ProductCardProps = {
  product: {
    id: string
    name: string
    description: string | null
    warehouses: Array<{
      warehouseId: string
      warehouseName: string
      totalQuantity: number
      reservedQuantity: number
      availableStock: number
    }>
  }
}

function getReservationStorageKey(productId: string, warehouseId: string) {
  return `reservation:${productId}:${warehouseId}`
}

const interactiveFieldClass =
  "flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-cyan-300/25 hover:bg-cyan-300/8 active:border-cyan-300/25 active:bg-cyan-300/8 focus-within:border-[hsl(var(--ring))] focus-within:ring-2 focus-within:ring-[hsl(var(--ring))]/20"

function ProductCardInner({ product }: ProductCardProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [warehouseId, setWarehouseId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const totalAvailableStock = useMemo(
    () => product.warehouses.reduce((total, warehouse) => total + warehouse.availableStock, 0),
    [product.warehouses],
  )

  const selectedWarehouse = useMemo(
    () => product.warehouses.find((warehouse) => warehouse.warehouseId === warehouseId),
    [product.warehouses, warehouseId],
  )

  const warehouseOptions = useMemo(
    () =>
      [...product.warehouses].sort((left, right) => {
        const leftOutOfStock = left.availableStock === 0
        const rightOutOfStock = right.availableStock === 0

        if (leftOutOfStock !== rightOutOfStock) {
          return leftOutOfStock ? 1 : -1
        }

        return left.warehouseName.localeCompare(right.warehouseName)
      }),
    [product.warehouses],
  )

  const canReserve = Boolean(selectedWarehouse && selectedWarehouse.availableStock > 0 && quantity > 0)

  async function handleReserve() {
    if (!selectedWarehouse) {
      setErrorMessage("Choose a warehouse first.")
      return
    }

    setErrorMessage(null)

    setIsSubmitting(true)
    setIsNavigating(false)

    let navigatedToReservation = false

    try {
      const storageKey = getReservationStorageKey(product.id, selectedWarehouse.warehouseId)
      try {
        const existingReservationId = window.localStorage.getItem(storageKey)

        if (existingReservationId) {
          const existingResponse = await fetch(`/api/reservations/${existingReservationId}`, {
            cache: "no-store",
          })

          if (existingResponse.ok) {
            const existingPayload = (await existingResponse.json().catch(() => null)) as {
              reservation?: { id: string; status?: string }
            } | null

            if (existingPayload?.reservation?.status === "PENDING") {
              navigatedToReservation = true
              setIsNavigating(true)
              router.push(`/reservations/${existingPayload.reservation.id}?resumed=1`)
              return
            }
          }

          window.localStorage.removeItem(storageKey)
        }
      } catch {
        window.localStorage.removeItem(storageKey)
      }

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string; reservation?: { id: string } } | null

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to create reservation.")
        return
      }

      if (!payload?.reservation?.id) {
        setErrorMessage("Reservation response was incomplete.")
        return
      }

      window.localStorage.setItem(storageKey, payload.reservation.id)

      navigatedToReservation = true
      setIsNavigating(true)
      router.push(`/reservations/${payload.reservation.id}`)
    } finally {
      setIsSubmitting(false)
      if (!navigatedToReservation) {
        setIsNavigating(false)
      }
    }
  }

  return (
    <>
      {isNavigating ? <PageTransitionLoader label="Opening reservation..." /> : null}
      <Card className="h-full transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-cyan-300/35 hover:bg-cyan-300/8 hover:shadow-[0_16px_40px_rgba(34,211,238,0.16)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-balance text-2xl sm:text-[1.7rem]">{product.name}</CardTitle>
              <CardDescription className="text-balance">{product.description ?? ""}</CardDescription>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              {/* color the total available according to thresholds: 0=red, <=3=amber, >3=green */}
              <div
                className={
                  "mt-1 text-lg font-semibold leading-none sm:text-right " +
                  (totalAvailableStock === 0
                    ? "text-red-400"
                    : totalAvailableStock <= 3
                      ? "text-amber-400"
                      : "text-emerald-400")
                }
              >
                {totalAvailableStock === 0 ? "Out of stock" : totalAvailableStock <= 3 ? `Hurry up! Only ${totalAvailableStock}` : `Available: ${totalAvailableStock}`}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {product.warehouses.map((warehouse) => (
              <div
                key={warehouse.warehouseId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:shadow-[0_8px_24px_rgba(34,211,238,0.12)]"
              >
                <div>
                  <div className="text-sm font-medium text-white">{warehouse.warehouseName}</div>
                  <div className="text-xs text-white/45">
                    {warehouse.availableStock === 0
                      ? "Out of stock"
                      : `Reserved: ${warehouse.reservedQuantity}`}
                  </div>
                </div>
                <StockBadge availableStock={warehouse.availableStock} totalQuantity={warehouse.totalQuantity} />
              </div>
            ))}
          </div>

          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`warehouse-${product.id}`}>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id={`warehouse-${product.id}`} className="group">
                  <SelectValue placeholder="Select warehouse">
                    {selectedWarehouse?.warehouseName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((warehouse) => (
                    <SelectItem
                      key={warehouse.warehouseId}
                      value={warehouse.warehouseId}
                      disabled={warehouse.availableStock === 0}
                      className={warehouse.availableStock === 0 ? "!opacity-100" : undefined}
                    >
                      <span className="flex w-full items-start justify-between gap-3">
                        <span className="min-w-0 flex-1 whitespace-normal break-words">{warehouse.warehouseName}</span>
                        <span className="shrink-0">
                          {warehouse.availableStock === 0 ? (
                            <span className="font-medium text-rose-300">Out of stock</span>
                          ) : warehouse.availableStock <= 3 ? (
                            <span className="text-amber-500">Hurry up! Only {warehouse.availableStock}</span>
                          ) : (
                            <span className="text-emerald-400">Available: {warehouse.availableStock}</span>
                          )}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`quantity-${product.id}`}>Quantity</Label>
              <div className={interactiveFieldClass}>
                <Input
                  id={`quantity-${product.id}`}
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  onFocus={(event) => event.currentTarget.select()}
                  onPointerDown={(event) => event.currentTarget.select()}
                  onWheel={(event) => event.currentTarget.blur()}
                  className="rounded-none border-0 bg-transparent focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={handleReserve} disabled={!canReserve || isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Reserving..." : "Reserve"}
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}

export const ProductCard = memo(ProductCardInner)
