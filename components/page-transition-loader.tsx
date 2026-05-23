"use client"

type PageTransitionLoaderProps = {
  label?: string
}

export function PageTransitionLoader({ label = "Loading next page..." }: PageTransitionLoaderProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50" role="status" aria-live="polite" aria-label={label}>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[hsl(var(--card))]/95 px-6 py-5 shadow-2xl">
        <div className="h-10 w-10 animate-spin motion-reduce:animate-none rounded-full border-2 border-white/20 border-t-cyan-300" />
        <div className="text-sm font-medium text-white/90">{label}</div>
      </div>
    </div>
  )
}