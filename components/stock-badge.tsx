import { Badge } from "@/components/ui/badge"

type StockBadgeProps = {
  availableStock: number
  totalQuantity: number
}

export function StockBadge({ availableStock, totalQuantity }: StockBadgeProps) {
  const isFullyAvailable = totalQuantity > 0 && availableStock === totalQuantity
  const variant =
    availableStock === 0
      ? "destructive"
      : isFullyAvailable
        ? "default"
        : availableStock <= 3
          ? "secondary"
          : "default"

  return (
    <Badge variant={variant}>
      {availableStock} / {totalQuantity} available
    </Badge>
  )
}
