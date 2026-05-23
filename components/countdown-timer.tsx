"use client"

import { useEffect, useMemo, useState } from "react"

type CountdownTimerProps = {
  expiresAt: string
  initialRemainingMs: number
  onExpired?: () => void
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function CountdownTimer({ expiresAt, initialRemainingMs, onExpired }: CountdownTimerProps) {
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt])
  const [remaining, setRemaining] = useState(() => initialRemainingMs)

  useEffect(() => {
    const updateRemaining = () => {
      const nextRemaining = target - Date.now()
      setRemaining(nextRemaining)

      if (nextRemaining <= 0) {
        onExpired?.()
      }
    }

    updateRemaining()
    const interval = window.setInterval(updateRemaining, 1000)

    return () => window.clearInterval(interval)
  }, [onExpired, target])

  const isExpired = remaining <= 0

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.24em] text-white/50">Time left</div>
      <div className={`mt-1 text-2xl font-semibold ${isExpired ? "text-[hsl(var(--destructive))]" : "text-white"}`}>
        {isExpired ? "Expired" : formatRemaining(remaining)}
      </div>
    </div>
  )
}
