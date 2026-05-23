import { SkeletonGrid } from "@/components/skeleton-grid"

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="h-4 w-40 rounded-full bg-white/10" />
        <div className="mt-4 h-10 w-3/4 rounded-2xl bg-white/10" />
        <div className="mt-3 h-5 w-2/3 rounded-2xl bg-white/10" />
      </div>
      <SkeletonGrid />
    </main>
  )
}
