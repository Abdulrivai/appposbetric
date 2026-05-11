import { Skeleton } from '@/components/ui/skeleton'

export default function AntrianLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="flex gap-2 mb-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 w-24" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
