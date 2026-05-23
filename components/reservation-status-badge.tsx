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
    return <Badge className="bg-emerald-500 text-white">CONFIRMED</Badge>
  }

  if (status === "RELEASED") {
    return <Badge className="bg-sky-500 text-white">RELEASED</Badge>
  }

  return <Badge className="bg-amber-500 text-black">PENDING</Badge>
}
