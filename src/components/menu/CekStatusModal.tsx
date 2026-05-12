'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah } from '@/lib/utils'
import { X, Search, CheckCircle2, Clock, Loader2, ChefHat, Package, AlertCircle, Hash } from 'lucide-react'

interface OrderStatus {
  id: string
  order_code: string
  queue_number: string
  status: string
  order_type: string
  table_number: string | null
  items: { name: string; qty: number; subtotal: number }[]
  total_amount: number
  created_at: string
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; desc: string }> = {
  pending: {
    label: 'Menunggu Pembayaran',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Clock className="h-8 w-8 text-amber-500" />,
    desc: 'Pesanan sedang menunggu konfirmasi pembayaran',
  },
  waiting_payment: {
    label: 'Menunggu Pembayaran',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Clock className="h-8 w-8 text-amber-500" />,
    desc: 'Silakan lakukan pembayaran ke kasir',
  },
  paid: {
    label: 'Sedang Diproses',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    icon: <ChefHat className="h-8 w-8 text-blue-500 animate-bounce" />,
    desc: 'Pesanan sedang dibuat, mohon tunggu sebentar ☕',
  },
  done: {
    label: 'Pesanan Siap!',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
    desc: 'Pesanan kamu sudah siap, silakan ambil di counter 🎉',
  },
  expired: {
    label: 'Order Kedaluwarsa',
    color: 'text-gray-500',
    bg: 'bg-gray-50 border-gray-200',
    icon: <AlertCircle className="h-8 w-8 text-gray-400" />,
    desc: 'Order ini sudah tidak aktif',
  },
  failed: {
    label: 'Order Gagal',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    icon: <AlertCircle className="h-8 w-8 text-red-400" />,
    desc: 'Terjadi kesalahan pada order ini',
  },
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CekStatusModal({ open, onClose }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderStatus | null>(null)
  const [error, setError] = useState('')
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input saat modal buka
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Reset saat tutup
      setInput('')
      setOrder(null)
      setError('')
    }
  }, [open])

  // Cleanup realtime saat unmount / modal tutup
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  async function handleCek() {
    const queueNo = input.trim().toUpperCase()
    if (!queueNo) return

    setLoading(true)
    setError('')
    setOrder(null)

    // Cleanup realtime lama
    if (channelRef.current) {
      createClient().removeChannel(channelRef.current)
      channelRef.current = null
    }

    try {
      const res = await fetch(`/api/status?queue=${encodeURIComponent(queueNo)}`)
      const data = await res.json()

      if (!res.ok || !data.order) {
        setError(data.error || 'Nomor antrian tidak ditemukan. Pastikan nomor yang kamu masukkan benar.')
        setLoading(false)
        return
      }

      setOrder(data.order)

      // Subscribe realtime untuk update otomatis
      const supabase = createClient()
      const channel = supabase
        .channel(`order-status-${data.order.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${data.order.id}` },
          (payload) => {
            setOrder((prev) => prev ? { ...prev, status: payload.new.status } : prev)
          }
        )
        .subscribe()

      channelRef.current = channel
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const statusInfo = order ? (STATUS_INFO[order.status] ?? STATUS_INFO.pending) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900">
              <Package className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Cek Status Pesanan</h2>
              <p className="text-xs text-gray-400">Masukkan nomor antrian kamu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Input nomor antrian */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Contoh: 1"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.toUpperCase())
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCek()}
                className="w-full pl-9 pr-4 h-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono font-semibold tracking-widest placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all uppercase"
                maxLength={10}
              />
            </div>
            <button
              onClick={handleCek}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-4 h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cek
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Hasil */}
          {order && statusInfo && (
            <div className="space-y-3">
              {/* Status card */}
              <div className={`rounded-2xl border-2 p-5 text-center space-y-3 transition-all duration-500 ${statusInfo.bg}`}>
                <div className="flex justify-center">{statusInfo.icon}</div>
                <div>
                  <p className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{statusInfo.desc}</p>
                </div>

                {/* Nomor antrian besar */}
                <div className="inline-flex flex-col items-center gap-1 bg-white rounded-xl px-6 py-3 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">No. Antrian</span>
                  <span className="text-4xl font-black font-mono text-gray-900 tracking-wider">
                    {order.queue_number}
                  </span>
                </div>
              </div>

              {/* Detail pesanan */}
              <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail Pesanan</p>
                </div>
                <div className="p-4 space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 flex-1">
                        {item.name}
                        <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          ×{item.qty}
                        </span>
                      </span>
                      <span className="font-medium text-gray-800 tabular-nums">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900 tabular-nums">{formatRupiah(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Cek nomor lain */}
              <button
                onClick={() => { setOrder(null); setInput(''); setError(''); inputRef.current?.focus() }}
                className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Cek nomor antrian lain
              </button>
            </div>
          )}

          {/* Info placeholder */}
          {!order && !error && !loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Nomor antrian tertera di struk</p>
                <p className="text-xs text-gray-400 mt-1">atau tanyakan ke kasir</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
