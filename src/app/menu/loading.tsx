import { Skeleton } from '@/components/ui/skeleton'

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b shadow-sm px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="flex gap-2 mt-2.5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
          </div>
        </div>
      </div>

      {/* Product grid skeleton */}
      <div className="mx-auto max-w-4xl px-4 py-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-white p-3 shadow-sm border">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
