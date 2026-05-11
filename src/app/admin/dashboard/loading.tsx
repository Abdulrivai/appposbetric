import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
      <Skeleton className="h-80 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
