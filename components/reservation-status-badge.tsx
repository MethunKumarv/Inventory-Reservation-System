import { Badge } from "@/components/ui/badge"

type ReservationStatusBadgeProps = {
  status: "PENDING" | "CONFIRMED" | "RELEASED"
  expired?: boolean
}

export function ReservationStatusBadge({ status, expired }: ReservationStatusBadgeProps) {
  if (expired && status === "PENDING") {
    return <Badge variant="destructive">EXPIRED</Badge>
  }

  if (status === "CONFIRMED") {
    return <Badge>CONFIRMED</Badge>
  }

  if (status === "RELEASED") {
    return <Badge variant="secondary">RELEASED</Badge>
  }

  return <Badge variant="outline">PENDING</Badge>
}
