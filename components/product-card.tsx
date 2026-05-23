"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StockBadge } from "@/components/stock-badge"

type ProductCardProps = {
  product: {
    id: string
    name: string
    description: string
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

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const canReserve = Boolean(selectedWarehouse && selectedWarehouse.availableStock > 0 && quantity > 0)

  async function handleReserve() {
    if (!selectedWarehouse) {
      setErrorMessage("Choose a warehouse first.")
      return
    }

    setErrorMessage(null)

    setIsSubmitting(true)

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
              router.push(`/reservations/${existingPayload.reservation.id}`)
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

      router.push(`/reservations/${payload.reservation.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-balance">{product.name}</CardTitle>
            <CardDescription className="text-balance">{product.description}</CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[0.65rem] uppercase tracking-[0.24em] text-white/45">Available</div>
            <div className="mt-1 text-lg font-semibold leading-none text-white">{totalAvailableStock}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {product.warehouses.map((warehouse) => (
            <div key={warehouse.warehouseId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">{warehouse.warehouseName}</div>
                <div className="text-xs text-white/45">Reserved: {warehouse.reservedQuantity}</div>
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
                {product.warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="truncate">{warehouse.warehouseName}</span>
                      <span className="shrink-0 text-white/55">{warehouse.availableStock} available</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`quantity-${product.id}`}>Quantity</Label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10 focus-within:border-[hsl(var(--ring))] focus-within:ring-2 focus-within:ring-[hsl(var(--ring))]/20">
              <Input
                id={`quantity-${product.id}`}
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
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
  )
}
