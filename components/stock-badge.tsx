import { memo } from "react"

import { Badge } from "@/components/ui/badge"

type StockBadgeProps = {
  availableStock: number
  totalQuantity: number
  plain?: boolean
}

function StockBadgeInner({ availableStock, totalQuantity, plain = false }: StockBadgeProps) {
  // Treat very small available counts as "Low stock" regardless of whether
  // they equal the total (e.g. 1/1 should be considered low stock).
  const isLowStock = availableStock > 0 && availableStock <= 3

  const variant = availableStock === 0 ? "destructive" : isLowStock ? "secondary" : "default"

  const statusLabel =
    availableStock === 0 ? "Out of stock" : isLowStock ? "Low stock" : "In stock"

  // For low stock, make the badge background amber with dark text for
  // higher contrast so it stands out clearly.
  // Use Tailwind's important modifier so the amber background overrides the
  // `Badge` variant background classes injected earlier.
  const lowStockClass = isLowStock ? "!bg-amber-500 !text-black" : undefined

  // When `plain` is requested (used on the reservation page), render a
  // neutral, non-colored textual indicator instead of the colored badge.
  if (plain) {
    return (
      <span aria-label={`${statusLabel}. ${availableStock} available out of ${totalQuantity}`} className="text-sm font-semibold text-white">
        {availableStock === 0 ? statusLabel : `Available: ${availableStock}`}
      </span>
    )
  }

  return (
    <Badge
      variant={variant}
      className={lowStockClass}
      aria-label={`${statusLabel}. ${availableStock} available out of ${totalQuantity}`}
    >
      {availableStock === 0 ? statusLabel : isLowStock ? `Hurry up! Only ${availableStock} available` : `Available: ${availableStock}`}
    </Badge>
  )
}

export const StockBadge = memo(StockBadgeInner)
