'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store'
import { formatRupiah } from '@/lib/utils'
import { PaymentMethod } from '@/types'
import { QRISModal } from '@/components/menu/QRISModal'
import { TicketDownload, TicketData } from '@/components/menu/TicketDownload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, CheckCircle2, Loader2, QrCode, Wallet, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, orderType, tableNumber, getTotalPrice, setOrderType, setTableNumber, clearCart } = useCartStore()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')
  const [loading, setLoading] = useState(false)
  const [tableError, setTableError] = useState(false)
  const [storeName, setStoreName] = useState('Toko Kami')
  const [orderResult, setOrderResult] = useState<{
    orderId: string
    orderCode: string
    queueNumber: string
    qrUrl?: string
    midtransOrderId?: string
  } | null>(null)
  const [successData, setSuccessData] = useState<TicketData | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('store_settings').select('store_name').single().then(({ data }) => {
      if (data?.store_name) setStoreName(data.store_name)
    })
  }, [])

  const totalPrice = getTotalPrice()

  const handleQrisSuccess = useCallback(() => {
    if (!orderResult) return
    setSuccessData({
      storeName,
      orderCode: orderResult.orderCode,
      queueNumber: orderResult.queueNumber,
      items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total: totalPrice,
      paymentMethod: 'qris',
      orderType,
      tableNumber: tableNumber || undefined,
      createdAt: new Date().toISOString(),
    })
    clearCart()
    setShowSuccess(true)
    setOrderResult(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderResult?.orderId])

  if (items.length === 0 && !showSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gray-50 p-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">Keranjang kosong</p>
          <p className="text-sm text-gray-400 mt-1">Yuk, tambahkan menu dulu!</p>
        </div>
        <Button
          onClick={() => router.push('/menu')}
          className="bg-gray-900 hover:bg-gray-700 text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Menu
        </Button>
      </div>
    )
  }

  async function handleCheckout() {
    if (orderType === 'dine_in' && !tableNumber.trim()) {
      setTableError(true)
      toast.error('Masukkan nomor meja terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
          total_amount: totalPrice,
          order_type: orderType,
          table_number: tableNumber || undefined,
          payment_method: paymentMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error('Gagal membuat order', { description: data.error })
        return
      }

      setOrderResult({
        orderId: data.order_id,
        orderCode: data.order_code,
        queueNumber: data.queue_number ?? '-',
        qrUrl: data.qr_url,
        midtransOrderId: data.midtrans_order_id,
      })

      if (paymentMethod === 'cash') {
        setSuccessData({
          storeName,
          orderCode: data.order_code,
          queueNumber: data.queue_number ?? '-',
          items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          total: totalPrice,
          paymentMethod: 'cash',
          orderType,
          tableNumber: tableNumber || undefined,
          createdAt: new Date().toISOString(),
        })
        clearCart()
        setShowSuccess(true)
      }
    } catch {
      toast.error('Terjadi kesalahan, coba lagi')
    } finally {
      setLoading(false)
    }
  }

  if (showSuccess && successData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 py-10">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 shadow-lg">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Pesanan Masuk!</h2>
          <p className="text-sm text-gray-400 mt-1">
            {paymentMethod === 'cash' ? 'Tunjukkan kode order ke kasir untuk pembayaran' : 'Pembayaran QRIS berhasil, pesanan sedang diproses'}
          </p>
        </div>

        {/* Nomor Antrian — utama */}
        <div className="w-full max-w-xs rounded-2xl bg-gray-900 px-6 py-8 text-center shadow-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Nomor Antrian</p>
          <p className="text-6xl font-black font-mono text-white tracking-widest">{successData.queueNumber}</p>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">Pantau status pesanan dengan nomor ini</p>
        </div>

        {/* Kode Order — sekunder */}
        <div className="w-full max-w-xs rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Kode Order</p>
          <p className="text-xl font-bold font-mono text-gray-800 tracking-wider">{successData.orderCode}</p>
        </div>

        {/* Ticket download */}
        <TicketDownload data={successData} />

        <Button
          onClick={() => router.push('/menu')}
          className="w-full max-w-xs bg-gray-900 hover:bg-gray-800 h-12 rounded-xl text-sm font-bold"
        >
          Pesan Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-md bg-gray-900">
            <UtensilsCrossed className="h-4 w-4 text-white" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 pb-8">
        {/* Order summary */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-sm text-gray-800">Pesanan Kamu</h2>
          </div>
          <div className="p-4 space-y-2.5">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between items-center text-sm">
                <span className="flex-1 line-clamp-1 text-gray-700">
                  {item.name}
                  <span className="ml-1.5 text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    x{item.qty}
                  </span>
                </span>
                <span className="font-semibold text-gray-900 ml-3">{formatRupiah(item.price * item.qty)}</span>
              </div>
            ))}
            <Separator className="!my-3" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatRupiah(totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Order type */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-sm text-gray-800">Tipe Pesanan</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(['dine_in', 'take_away'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setOrderType(type); setTableError(false) }}
                  className={`rounded-xl border-2 p-4 text-sm font-medium transition-all flex flex-col items-center gap-1.5 ${
                    orderType === type
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-2xl">{type === 'dine_in' ? '🍽️' : '🥡'}</span>
                  <span>{type === 'dine_in' ? 'Makan di Tempat' : 'Bawa Pulang'}</span>
                </button>
              ))}
            </div>

            {orderType === 'dine_in' && (
              <div className="space-y-1.5">
                <Label htmlFor="tableNumber" className={`text-sm font-medium ${tableError ? 'text-red-600' : 'text-gray-700'}`}>
                  Nomor Meja <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tableNumber"
                  placeholder="Contoh: 5 atau A3"
                  value={tableNumber}
                  onChange={(e) => {
                    setTableNumber(e.target.value)
                    if (e.target.value.trim()) setTableError(false)
                  }}
                  className={`h-11 rounded-xl transition-colors ${tableError ? 'border-red-400 focus-visible:ring-red-400 bg-red-50' : ''}`}
                />
                {tableError && (
                  <p className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                    <span>⚠️</span>
                    Nomor meja wajib diisi sebelum checkout
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment method */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-sm text-gray-800">Metode Pembayaran</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'qris', icon: QrCode, label: 'QRIS', desc: 'Bayar via QR Code', emoji: '📱' },
                { value: 'cash', icon: Wallet, label: 'Tunai', desc: 'Bayar ke kasir', emoji: '💵' },
              ] as const).map(({ value, label, desc, emoji }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    paymentMethod === value
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className={`text-xs mt-0.5 ${paymentMethod === value ? 'text-gray-300' : 'text-gray-400'}`}>
                      {desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pay button */}
        <button
          disabled={loading}
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-base font-bold text-white hover:bg-gray-700 disabled:opacity-60 disabled:pointer-events-none transition-colors active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Memproses...
            </>
          ) : (
            `Bayar ${formatRupiah(totalPrice)}`
          )}
        </button>
      </main>

      {orderResult && paymentMethod === 'qris' && (
        <QRISModal
          open={!!orderResult && paymentMethod === 'qris'}
          orderId={orderResult.orderId}
          orderCode={orderResult.orderCode}
          qrUrl={orderResult.qrUrl ?? ''}
          midtransOrderId={orderResult.midtransOrderId ?? ''}
          onSuccess={handleQrisSuccess}
          onCancel={() => setOrderResult(null)}
        />
      )}
    </div>
  )
}
