'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Timer } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface QRISModalProps {
  open: boolean
  orderId: string
  orderCode: string
  qrUrl: string
  midtransOrderId: string
  onSuccess: () => void
}

export function QRISModal({ open, orderId, orderCode, qrUrl, midtransOrderId, onSuccess }: QRISModalProps) {
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed'>('waiting')
  const [timeLeft, setTimeLeft] = useState(900)
  const successRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setStatus('waiting')
      setTimeLeft(900)
      successRef.current = false
      return
    }

    const supabase = createClient()

    // Realtime: update otomatis jika webhook berhasil masuk
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const s = payload.new.status
          if ((s === 'paid' || s === 'done') && !successRef.current) {
            successRef.current = true
            setStatus('success')
            setTimeout(onSuccess, 2000)
          } else if (s === 'expired' || s === 'failed') {
            setStatus('failed')
          }
        }
      )
      .subscribe()

    // Polling: cek ke Midtrans tiap 5 detik (fallback kalau webhook tidak masuk)
    const poll = setInterval(async () => {
      if (successRef.current) return
      try {
        const res = await fetch(`/api/midtrans/status?order_id=${midtransOrderId}`)
        const data = await res.json()
        if (data.status === 'paid' && !successRef.current) {
          successRef.current = true
          setStatus('success')
          setTimeout(onSuccess, 2000)
        } else if (data.status === 'expired' || data.status === 'failed') {
          setStatus('failed')
        }
      } catch {
        // abaikan error polling
      }
    }, 5000)

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
      clearInterval(timer)
    }
  }, [open, orderId, midtransOrderId, onSuccess])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center">Bayar via QRIS</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === 'waiting' && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Kode Order: <strong>{orderCode}</strong>
              </p>

              {qrUrl ? (
                <div className="rounded-lg border-2 border-gray-200 p-3">
                  <QRCodeSVG value={qrUrl} size={200} />
                </div>
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-lg border-2 border-gray-200">
                  <LoadingSpinner size={32} />
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>
                  Bayar dalam:{' '}
                  <strong className={timeLeft < 60 ? 'text-red-500' : ''}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <LoadingSpinner size={16} />
                <p className="text-sm text-muted-foreground">Menunggu pembayaran...</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900">Pembayaran Berhasil!</p>
              <p className="text-sm text-gray-400">Menampilkan nomor antrian...</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-xl font-bold text-red-500">Pembayaran Gagal</p>
              <p className="text-sm text-muted-foreground">QR code telah kadaluarsa atau dibatalkan.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
