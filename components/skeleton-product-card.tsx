export function SkeletonProductCard() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-3/4 rounded-xl bg-white/6 mb-3" />
      <div className="h-4 w-1/2 rounded-xl bg-white/6 mb-6" />

      <div className="space-y-3">
        <div className="h-12 rounded-2xl bg-white/3" />
        <div className="h-12 rounded-2xl bg-white/3" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-10 w-24 rounded-xl bg-white/6" />
        <div className="h-10 w-16 rounded-xl bg-white/6" />
      </div>
    </div>
  )
}
