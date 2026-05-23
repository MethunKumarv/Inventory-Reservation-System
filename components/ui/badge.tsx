import * as React from "react"

import { cn } from "@/lib/utils"

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

const variantClasses = {
  default: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
  secondary: "bg-white/10 text-[hsl(var(--foreground))]",
  destructive: "bg-[hsl(var(--destructive))] text-white",
  outline: "border border-white/15 bg-transparent text-[hsl(var(--foreground))]",
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
