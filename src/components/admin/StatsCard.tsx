import { LucideIcon } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  isRupiah?: boolean
  icon: LucideIcon
  description?: string
  trend?: { value: number; label: string }
}

export function StatsCard({ title, value, isRupiah, icon: Icon, description, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3">
      <div className="rounded-lg bg-gray-100 p-2.5 shrink-0">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight truncate">
          {isRupiah ? formatRupiah(typeof value === 'number' ? value : 0) : value}
        </p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        {trend && (
          <p className={`text-xs mt-0.5 font-medium ${trend.value >= 0 ? 'text-gray-700' : 'text-gray-400'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
