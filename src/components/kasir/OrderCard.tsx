'use client'

import { useState, useEffect, useRef } from 'react'
import { Order } from '@/types'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ORDER_STATUS_LABELS } from '@/lib/order-status'
import { Loader2, Printer, CheckCheck, CreditCard, Clock, Utensils, ShoppingBag, QrCode, Banknote, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { quickPrint } from '@/lib/qz-print'

interface OrderCardProps {
  order: Order
  onUpdate: () => void
  storeName?: string
  footerText?: string
  logoUrl?: string
}

const EXPIRE_MINUTES = 10

function PendingCountdown({ createdAt, onExpired }: { createdAt: string; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(() => {
    const expires = new Date(createdAt).getTime() + EXPIRE_MINUTES * 60 * 1000
    return Math.max(0, expires - Date.now())
  })
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  useEffect(() => {
    const t = setInterval(() => {
      const expires = new Date(createdAt).getTime() + EXPIRE_MINUTES * 60 * 1000
      const diff = Math.max(0, expires - Date.now())
      setRemaining(diff)
      if (diff === 0) { onExpiredRef.current(); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [createdAt])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  const urgent = remaining < 2 * 60 * 1000

  return (
    <span className={cn(
      'flex items-center gap-1 font-mono text-xs font-bold tabular-nums',
      urgent ? 'text-red-500 animate-pulse' : 'text-amber-500'
    )}>
      <Clock className="h-3 w-3" />
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

const STATUS_CARD_CONFIG = {
  pending:         { border: 'border-l-gray-900',  text: 'text-gray-900',  bg: 'bg-gray-100' },
  waiting_payment: { border: 'border-l-gray-700',  text: 'text-gray-800',  bg: 'bg-gray-100' },
  paid:            { border: 'border-l-gray-900',  text: 'text-gray-900',  bg: 'bg-gray-900' },
  done:            { border: 'border-l-gray-300',  text: 'text-gray-400',  bg: 'bg-gray-50' },
  expired:         { border: 'border-l-gray-200',  text: 'text-gray-400',  bg: 'bg-gray-50' },
  failed:          { border: 'border-l-gray-400',  text: 'text-gray-600',  bg: 'bg-gray-100' },
} as const

export function OrderCard({ order, onUpdate, storeName, footerText, logoUrl }: OrderCardProps) {
  const [loading, setLoading]       = useState(false)
  const [printing, setPrinting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cfg = STATUS_CARD_CONFIG[order.status] ?? STATUS_CARD_CONFIG.pending

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Gagal hapus order'); return }
      toast.success('Order dihapus')
      onUpdate()
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
      setConfirmDelete(false)
    }
  }

  async function handleAction(action: 'confirm_payment' | 'mark_done') {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Gagal update order')
        return
      }
      toast.success(action === 'confirm_payment' ? 'Pembayaran dikonfirmasi' : 'Order selesai')
      onUpdate()
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={cn('rounded-lg border border-l-4 bg-white shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow', cfg.border)}>
        {/* Header */}
        <div className={cn('px-4 py-3 flex items-center justify-between gap-2', cfg.bg)}>
          <span className={cn('font-mono font-bold text-base tracking-wide', order.status === 'paid' ? 'text-white' : 'text-gray-900')}>
            {order.order_code}
          </span>
          <span className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
            order.status === 'paid' ? 'text-white border-white/30' : 'border-current/20 ' + cfg.text
          )}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        {/* Meta */}
        <div className="px-4 py-2 flex items-center gap-3 text-xs text-muted-foreground border-b border-gray-50">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(order.created_at)}
          </span>
          {order.status === 'pending' && (
            <PendingCountdown createdAt={order.created_at} onExpired={onUpdate} />
          )}
          <span className="flex items-center gap-1">
            {order.order_type === 'dine_in'
              ? <><Utensils className="h-3 w-3" /> Meja {order.table_number}</>
              : <><ShoppingBag className="h-3 w-3" /> Bawa Pulang</>}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            {order.payment_method === 'qris'
              ? <><QrCode className="h-3 w-3" /> QRIS</>
              : order.payment_method === 'edc'
                ? <><CreditCard className="h-3 w-3" /> EDC</>
                : <><Banknote className="h-3 w-3" /> Tunai</>}
          </span>
        </div>

        {/* Items */}
        <div className="flex-1 px-4 py-3 space-y-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-gray-700">
                {item.name}
                <span className="ml-1 text-muted-foreground">×{item.qty}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mx-4 border-t border-gray-50 pt-2 pb-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold text-base tabular-nums text-gray-900">{formatRupiah(order.total_amount)}</span>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          {order.status === 'waiting_payment' && order.payment_method === 'cash' && (
            <Button
              size="sm"
              className="flex-1 h-9 bg-gray-900 hover:bg-gray-700 text-white"
              disabled={loading}
              onClick={() => handleAction('confirm_payment')}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              Konfirmasi Bayar
            </Button>
          )}

          {order.status === 'paid' && (
            <Button
              size="sm"
              className="flex-1 h-9 bg-gray-900 hover:bg-gray-700 text-white"
              disabled={loading}
              onClick={() => handleAction('mark_done')}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Tandai Selesai
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 border-gray-200 hover:bg-gray-50"
            disabled={printing}
            onClick={async () => {
              setPrinting(true)
              try {
                await quickPrint(order, storeName, footerText, logoUrl)
                toast.success('Struk dicetak!')
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error('[Print error]', err)
                toast.error(`Gagal cetak: ${msg}`)
              } finally {
                setPrinting(false)
              }
            }}
          >
            {printing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Printer className="h-3.5 w-3.5" />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            disabled={loading}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus Order?"
        description={`Order ${order.order_code} akan dihapus secara permanen.`}
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        loading={loading}
        destructive
      />
    </>
  )
}
