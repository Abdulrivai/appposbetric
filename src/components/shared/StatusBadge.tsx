import { Badge } from '@/components/ui/badge'
import { OrderStatus } from '@/types'
import { ORDER_STATUS_LABELS } from '@/lib/order-status'

const BADGE_STYLES: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  pending:         { variant: 'secondary', className: 'bg-gray-100 text-gray-600' },
  waiting_payment: { variant: 'outline',   className: 'bg-amber-50 text-amber-700 border-amber-300' },
  paid:            { variant: 'default',   className: 'bg-blue-100 text-blue-700 border-0' },
  done:            { variant: 'default',   className: 'bg-green-100 text-green-700 border-0' },
  expired:         { variant: 'outline',   className: 'bg-gray-50 text-gray-500 border-gray-200' },
  failed:          { variant: 'destructive', className: 'bg-red-100 text-red-700 border-0' },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const style = BADGE_STYLES[status] ?? { variant: 'secondary' as const, className: '' }
  return (
    <Badge variant={style.variant} className={style.className}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
