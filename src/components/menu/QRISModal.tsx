'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { CheckCircle2, Timer, Download, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { toast } from 'sonner'

interface QRISModalProps {
  open: boolean
  orderId: string
  orderCode: string
  qrUrl: string
  midtransOrderId: string
  onSuccess: () => void
  onCancel: () => void
}

export function QRISModal({ open, orderId, orderCode, qrUrl, midtransOrderId, onSuccess, onCancel }: QRISModalProps) {
  const [status, setStatus]               = useState<'waiting' | 'success' | 'failed'>('waiting')
  const [timeLeft, setTimeLeft]           = useState(600)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling]       = useState(false)

  const successRef = useRef(false)
  const canvasRef  = useRef<HTMLCanvasElement>(null)

  // Reset state setiap modal buka/tutup
  useEffect(() => {
    if (!open) {
      setStatus('waiting')
      setTimeLeft(600)
      setConfirmCancel(false)
      successRef.current = false
      return
    }

    const supabase = createClient()

    // Realtime: update otomatis jika webhook masuk
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const s = payload.new.status
          if ((s === 'paid' || s === 'done') && !successRef.current) {
            successRef.current = true
            setStatus('success')
            // Langsung pindah setelah animasi singkat selesai (2 detik)
            setTimeout(onSuccess, 2000)
          } else if (s === 'expired' || s === 'failed') {
            setStatus('failed')
          }
        }
      )
      .subscribe()

    // Polling fallback tiap 5 detik
    const poll = setInterval(async () => {
      if (successRef.current) return
      try {
        const res  = await fetch(`/api/midtrans/status?order_id=${midtransOrderId}`)
        const data = await res.json()
        if (data.status === 'paid' && !successRef.current) {
          successRef.current = true
          setStatus('success')
          setTimeout(onSuccess, 2000)
        } else if (data.status === 'expired' || data.status === 'failed') {
          setStatus('failed')
        }
      } catch { /* abaikan */ }
    }, 5000)

    // Countdown timer pembayaran (10 menit)
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
      clearInterval(timer)
    }
  }, [open, orderId, midtransOrderId, onSuccess])

  function downloadQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a   = document.createElement('a')
    a.href     = url
    a.download = `qris-${orderCode}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('QR Code berhasil diunduh!')
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Gagal membatalkan pesanan'); return }
      toast.success('Pesanan dibatalkan')
      onCancel()
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center text-base font-bold">Bayar via QRIS</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pb-2">

          {/* ── Menunggu pembayaran ─────────────────────────────────── */}
          {status === 'waiting' && (
            <>
              {/* Banner peringatan jangan tutup */}
              <div className="w-full flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium leading-snug">
                  Jangan tutup atau refresh halaman ini. Setelah pembayaran diproses, tunggu hingga <strong>20 detik</strong> untuk konfirmasi otomatis.
                </p>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Kode Order: <strong className="text-gray-700">{orderCode}</strong>
              </p>

              {/* QR Code */}
              {qrUrl ? (
                <div className="rounded-xl border-2 border-gray-100 p-3 bg-white shadow-sm">
                  <QRCodeSVG value={qrUrl} size={192} />
                </div>
              ) : (
                <div className="flex h-52 w-52 items-center justify-center rounded-xl border-2 border-gray-100">
                  <LoadingSpinner size={32} />
                </div>
              )}

              {/* Canvas tersembunyi untuk download */}
              <div className="hidden">
                <QRCodeCanvas ref={canvasRef} value={qrUrl || ' '} size={512} />
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Timer className="h-4 w-4" />
                <span>
                  Bayar dalam:{' '}
                  <strong className={timeLeft < 60 ? 'text-red-500' : 'text-gray-700'}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <LoadingSpinner size={14} />
                <p className="text-xs text-gray-400">Menunggu konfirmasi pembayaran...</p>
              </div>

              {/* Tombol aksi */}
              <div className="flex w-full gap-2 pt-1">
                {/* Download QR */}
                {qrUrl && (
                  <button
                    onClick={downloadQR}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-gray-100 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </button>
                )}

                {/* Batalkan pembayaran */}
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-100 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-100 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Batalkan
                </button>
              </div>

              {/* Konfirmasi batalkan */}
              {confirmCancel && (
                <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700 text-center">Batalkan pesanan ini?</p>
                  <p className="text-xs text-red-500 text-center leading-snug">
                    Pesanan akan dihapus dan kamu perlu memesan ulang.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Tidak
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1"
                    >
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Ya, Batalkan
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Pembayaran berhasil ─────────────────────────────────── */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-2 w-full">

              {/* Icon sukses dengan animasi scale-in */}
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gray-900"
                style={{ animation: 'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
              >
                {/* Ripple ring */}
                <div className="absolute inset-0 rounded-full bg-gray-900 opacity-20 animate-ping" />
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>

              {/* Teks sukses dengan fade-up */}
              <div
                className="text-center space-y-1"
                style={{ animation: 'fade-up 0.4s ease 0.3s both' }}
              >
                <p className="text-2xl font-black text-gray-900">Pembayaran Berhasil!</p>
                <p className="text-sm text-gray-400">Pesananmu dikonfirmasi ✓</p>
              </div>

              {/* Banner jangan tutup */}
              <div
                className="w-full flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
                style={{ animation: 'fade-up 0.4s ease 0.5s both' }}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 font-medium leading-snug">
                  <p><strong>Jangan tutup halaman ini!</strong></p>
                  <p className="mt-0.5">Sedang menyiapkan nomor antrian kamu...</p>
                </div>
              </div>

              {/* Loading bar dengan shimmer */}
              <div
                className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
                style={{ animation: 'fade-up 0.4s ease 0.6s both' }}
              >
                <div
                  className="relative h-full rounded-full bg-gray-900 overflow-hidden"
                  style={{ animation: 'progress-fill 2s ease-in-out forwards' }}
                >
                  {/* Shimmer overlay */}
                  <div
                    className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{ animation: 'shimmer 1.2s ease-in-out infinite' }}
                  />
                </div>
              </div>

              <p
                className="text-xs text-gray-400"
                style={{ animation: 'fade-up 0.4s ease 0.7s both' }}
              >
                Mohon tunggu sebentar...
              </p>
            </div>
          )}

          {/* ── Pembayaran gagal/expired ────────────────────────────── */}
          {status === 'failed' && (
            <div className="flex flex-col items-center gap-3 py-6 w-full">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">Pembayaran Gagal</p>
                <p className="text-sm text-gray-400 mt-1">QR code kadaluarsa atau dibatalkan.</p>
              </div>
              <button
                onClick={onCancel}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
              >
                Kembali &amp; Pesan Ulang
              </button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
