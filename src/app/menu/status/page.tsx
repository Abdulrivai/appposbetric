'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatRupiah } from '@/lib/utils'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, AlertCircle, Utensils, ShoppingBag, Check } from 'lucide-react'

interface OrderData {
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

// Urutan tahapan pesanan
const STEPS = [
  { key: 'waiting_payment', short: 'Pembayaran' },
  { key: 'paid',            short: 'Diproses'   },
  { key: 'done',            short: 'Siap'        },
]

const STATUS_META: Record<string, { label: string; sub: string; step: number; image: string }> = {
  pending:         { label: 'Menunggu Pembayaran', sub: 'Tunjukkan kode ke kasir',            step: 0,  image: '/QUICKCAFEBACKGROUND.png' },
  waiting_payment: { label: 'Menunggu Pembayaran', sub: 'Tunjukkan kode ke kasir',            step: 0,  image: '/QUICKCAFEBACKGROUND.png' },
  paid:            { label: 'Sedang Dibuat',        sub: 'Barista kami sedang menyiapkan ☕', step: 1,  image: '/pesanansedangdibuat.png'  },
  done:            { label: 'Pesanan Siap!',         sub: '',                                  step: 2,  image: '/pesananselesai.png'       },
  expired:         { label: 'Kedaluwarsa',           sub: 'Order ini sudah tidak aktif',       step: -1, image: '/QUICKCAFEBACKGROUND.png' },
  failed:          { label: 'Gagal',                 sub: 'Terjadi kesalahan pada order ini',  step: -1, image: '/QUICKCAFEBACKGROUND.png' },
}

// ── Inner component ───────────────────────────────────────────────────────────
function StatusContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [order, setOrder]     = useState<OrderData | null>(null)
  const [error, setError]     = useState('')

  const supabaseRef = useRef(createClient())
  const channelRef  = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    if (!q) { router.replace('/menu'); return }
    fetchOrder(q)
    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchOrder(queueNo: string) {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setLoading(true)
    try {
      const res  = await fetch(`/api/status?queue=${encodeURIComponent(queueNo.toUpperCase())}`)
      const data = await res.json()
      if (!res.ok || !data.order) { setError(data.error || 'Tidak ditemukan.'); return }
      setOrder(data.order)

      const ch = supabaseRef.current
        .channel(`status-${data.order.id}-${Date.now()}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${data.order.id}` },
          (payload) => setOrder((prev) => prev ? { ...prev, status: payload.new.status } : prev)
        )
        .subscribe()
      channelRef.current = ch
    } catch {
      setError('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const queue = searchParams.get('q')?.trim().toUpperCase() ?? ''

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
        <Loader2 className="h-7 w-7 animate-spin text-white/40" />
        <p className="mt-4 text-sm text-white/40 font-mono">{queue}</p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 gap-6">
        <AlertCircle className="h-12 w-12 text-white/30" />
        <div className="text-center">
          <p className="text-white font-bold text-lg">Nomor tidak ditemukan</p>
          <p className="text-white/40 text-sm mt-2 max-w-xs">{error}</p>
        </div>
        <button
          onClick={() => router.push('/menu')}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
      </div>
    )
  }

  if (!order) return null

  const meta    = STATUS_META[order.status] ?? STATUS_META.pending
  const isDone  = order.status === 'done'
  const isDineIn = order.order_type === 'dine_in'
  const isBad   = order.status === 'expired' || order.status === 'failed'

  const doneMsg = isDineIn
    ? `Diantar ke Meja ${order.table_number} 🛎️`
    : 'Ambil di kasir 🎉'

  const statusBadgeClass = isBad
    ? 'border-red-500/30 bg-red-500/10 text-red-400'
    : isDone
    ? 'border-green-400/30 bg-green-400/10 text-green-400'
    : 'border-amber-400/30 bg-amber-400/10 text-amber-400'

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">

      {/* ── TOP — foto + overlay + konten ──────────────────────────────── */}
      <div className="relative flex-none overflow-hidden">
        <Image
          src={meta.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gray-950/78" />

        <div className="relative z-10 mx-auto max-w-lg px-5 pt-5 pb-12">

          {/* Nav bar */}
          <div className="flex items-center justify-between h-10 mb-8">
            <button
              onClick={() => router.push('/menu')}
              className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Menu
            </button>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/40 tracking-wider">LIVE</span>
            </div>
          </div>

          {/* Queue number */}
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-[0.35em] text-white/30 uppercase mb-3">
              Nomor Antrian
            </p>
            <motion.p
              key={order.queue_number}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-[5.5rem] font-black font-mono text-white leading-none tracking-widest"
            >
              {order.queue_number}
            </motion.p>
          </div>

          {/* Status badge + sublabel */}
          <div className="text-center mt-5 space-y-2">
            <motion.span
              key={order.status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`inline-block rounded-full border px-5 py-1.5 text-sm font-semibold ${statusBadgeClass}`}
            >
              {meta.label}
            </motion.span>
            <p className="text-white/40 text-sm">
              {isDone ? doneMsg : meta.sub}
            </p>
          </div>

          {/* Progress stepper */}
          {!isBad && (
            <div className="mt-10">
              <div className="relative">

                {/* Track background — dari center circle pertama ke center circle terakhir */}
                <div className="absolute left-4 right-4 top-4 h-px bg-white/15 rounded-full" />

                {/* Track fill — bergerak sesuai step */}
                <motion.div
                  className="absolute left-4 top-4 h-px bg-white rounded-full origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: meta.step / (STEPS.length - 1) }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  style={{ right: '1rem' }}
                />

                {/* Circles + labels — justify-between supaya rata kiri-kanan */}
                <div className="relative flex justify-between">
                  {STEPS.map((step, i) => {
                    const done    = meta.step > i
                    const current = meta.step === i
                    return (
                      <div key={step.key} className="flex flex-col items-center gap-2">

                        {/* Circle */}
                        <div className="relative flex items-center justify-center w-8 h-8">
                          {current && (
                            <motion.div
                              className="absolute inset-0 rounded-full bg-white/20"
                              animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.12, type: 'spring', stiffness: 300, damping: 20 }}
                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                              done    ? 'border-white bg-white'    :
                              current ? 'border-white bg-white/15' :
                                        'border-white/20 bg-transparent'
                            }`}
                          >
                            {done ? (
                              <Check className="h-3.5 w-3.5 text-gray-900 stroke-[3]" />
                            ) : current ? (
                              <motion.div
                                className="h-2.5 w-2.5 rounded-full bg-white"
                                animate={{ scale: [1, 1.4, 1] }}
                                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                              />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-white/20" />
                            )}
                          </motion.div>
                        </div>

                        {/* Label */}
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.12 + 0.1 }}
                          className={`text-[10px] font-bold tracking-wide ${
                            done || current ? 'text-white/80' : 'text-white/25'
                          }`}
                        >
                          {step.short}
                        </motion.span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── BOTTOM — white sheet ──────────────────────────────────────── */}
      <div className="flex-1 rounded-t-[28px] bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
        <div className="mx-auto max-w-lg px-5 pt-6 pb-10 space-y-5">

          {/* Order type + kode */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              {isDineIn
                ? <><Utensils className="h-3.5 w-3.5" /> Meja {order.table_number}</>
                : <><ShoppingBag className="h-3.5 w-3.5" /> Bawa Pulang</>
              }
            </span>
            <span className="text-xs font-mono font-medium text-gray-300">{order.order_code}</span>
          </div>

          {/* Item list */}
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2 flex-1 min-w-0">
                  <span className="shrink-0 text-xs font-bold tabular-nums text-gray-400">{item.qty}×</span>
                  <span className="text-sm text-gray-800 truncate">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">
                  {formatRupiah(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-4">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-lg font-black text-gray-900 tabular-nums">
              {formatRupiah(order.total_amount)}
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/menu')}
            className="w-full rounded-2xl bg-gray-950 py-4 text-sm font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            + Pesan Lagi
          </button>

        </div>
      </div>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-7 w-7 animate-spin text-white/40" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  )
}
