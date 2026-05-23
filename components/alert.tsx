"use client"

import * as React from "react"

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "info" | "success" | "error"
}

export function Alert({ variant = "info", className, children, ...props }: AlertProps) {
  const base = "rounded-2xl border px-4 py-3 text-sm"

  const variantClasses = {
    info: "border-white/10 bg-white/5 text-white/80",
    success: "border-green-600 bg-green-700/10 text-green-200",
    error: "border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 text-red-100",
  }

  return (
    <div className={`${base} ${variantClasses[variant]} ${className ?? ""}`} role="alert" {...props}>
      {children}
    </div>
  )
}
