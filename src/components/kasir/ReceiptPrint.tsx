'use client'

import { Order } from '@/types'
import { formatRupiah, formatDateTime } from '@/lib/utils'

interface ReceiptPrintProps {
  order: Order
  storeName: string
  footerText?: string
}

export function ReceiptPrint({ order, storeName, footerText }: ReceiptPrintProps) {
  return (
    <div className="hidden print:block font-mono text-sm max-w-xs mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">{storeName}</h1>
        <p className="text-xs">================================</p>
      </div>

      <div className="mb-2 space-y-1">
        <div className="flex justify-between">
          <span>No. Order</span>
          <span className="font-bold">{order.order_code}</span>
        </div>
        <div className="flex justify-between">
          <span>Waktu</span>
          <span>{formatDateTime(order.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tipe</span>
          <span>
            {order.order_type === 'dine_in'
              ? `Dine In - Meja ${order.table_number}`
              : 'Take Away'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Bayar</span>
          <span>{order.payment_method === 'qris' ? 'QRIS' : order.payment_method === 'edc' ? 'EDC' : 'Tunai'}</span>
        </div>
      </div>

      <p className="text-xs">--------------------------------</p>

      <div className="my-2 space-y-1">
        {order.items.map((item, i) => (
          <div key={i}>
            <p>{item.name}</p>
            <div className="flex justify-between pl-2">
              <span>{item.qty} x {formatRupiah(item.price)}</span>
              <span>{formatRupiah(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs">================================</p>
      <div className="flex justify-between font-bold text-base my-1">
        <span>TOTAL</span>
        <span>{formatRupiah(order.total_amount)}</span>
      </div>
      <p className="text-xs">================================</p>

      <div className="text-center mt-4 space-y-1">
        <p className="text-xs">{footerText || 'Terima kasih telah berbelanja!'}</p>
        <p className="text-xs">Status: {order.status.toUpperCase()}</p>
      </div>
    </div>
  )
}
