import { formatRupiah } from '@/lib/utils'

interface PriceFormatProps {
  amount: number
  className?: string
}

export function PriceFormat({ amount, className }: PriceFormatProps) {
  return <span className={className}>{formatRupiah(amount)}</span>
}
