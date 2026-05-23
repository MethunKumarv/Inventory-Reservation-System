import { SkeletonGrid } from "@/components/skeleton-grid"

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-4 w-40 rounded-full bg-white/10" />
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
        <div className="h-5 w-1/3 rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
        <div className="mt-6">
          <SkeletonGrid count={1} />
        </div>
      </div>
    </main>
  )
}
