import { SkeletonProductCard } from "./skeleton-product-card"

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-full">
          <SkeletonProductCard />
        </div>
      ))}
    </div>
  )
}
