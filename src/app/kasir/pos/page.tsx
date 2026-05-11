'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Order, Product, OrderType } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReceiptPrint } from '@/components/kasir/ReceiptPrint'
import { QzPrintButton } from '@/components/kasir/QzPrintButton'
import {
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote,
  CheckCircle2, UtensilsCrossed, Package, Search, X, Loader2,
  RotateCcw,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CartItem {
  product_id: string
  name: string
  price: number
  qty: number
  image_url: string | null
}

type PayMethod = 'cash' | 'edc'

const ALL_CAT = 'Semua'

function parseCash(v: string): number {
  return parseInt(v.replace(/[^\d]/g, '') || '0')
}

function quickAmounts(total: number): { label: string; value: number }[] {
  const ceil = (n: number, to: number) => Math.ceil(n / to) * to
  const unique = new Map<number, string>()
  unique.set(total, 'Uang Pas')
  const r1 = ceil(total, 1000); if (r1 !== total) unique.set(r1, formatRupiah(r1))
  const r5 = ceil(total, 5000); if (!unique.has(r5)) unique.set(r5, formatRupiah(r5))
  const r10 = ceil(total, 10000); if (!unique.has(r10)) unique.set(r10, formatRupiah(r10))
  const r50 = ceil(total, 50000); if (!unique.has(r50)) unique.set(r50, formatRupiah(r50))
  return Array.from(unique.entries()).slice(0, 4).map(([value, label]) => ({ label, value }))
}

export default function PosPage() {
  const [products, setProducts]       = useState<Product[]>([])
  const [loading, setLoading]         = useState(true)
  const [storeName, setStoreName]     = useState('Toko Kami')
  const [footerText, setFooterText]   = useState('Terima kasih!')
  const [logoUrl, setLogoUrl]         = useState('/logoquickcoffee.png')
  const [cart, setCart]               = useState<CartItem[]>([])
  const [category, setCategory]       = useState(ALL_CAT)
  const [search, setSearch]           = useState('')
  const [orderType, setOrderType]     = useState<OrderType>('dine_in')
  const [tableNumber, setTableNumber] = useState('')

  // Payment dialog
  const [payOpen, setPayOpen]       = useState(false)
  const [payMethod, setPayMethod]   = useState<PayMethod>('cash')
  const [cashInput, setCashInput]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [printOrder, setPrintOrder] = useState<Order | null>(null)
  const [success, setSuccess]       = useState<{ orderCode: string; change: number; method: PayMethod } | null>(null)

  const cashRef = useRef<HTMLInputElement>(null)

  // Fetch products + store settings on mount
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('products').select('id, name, description, price, image_url, category, stock, is_active').eq('is_active', true).order('category').order('name'),
      supabase.from('store_settings').select('store_name, footer_text, logo_url').single(),
    ]).then(([prodRes, settRes]) => {
      setProducts((prodRes.data as Product[]) ?? [])
      if (settRes.data) {
        setStoreName(settRes.data.store_name ?? 'Toko Kami')
        setFooterText(settRes.data.footer_text ?? 'Terima kasih!')
        setLogoUrl(settRes.data.logo_url ?? '/logoquickcoffee.png')
      }
      setLoading(false)
    })
  }, [])

  const categories = useMemo(
    () => [ALL_CAT, ...Array.from(new Set(products.map(p => p.category)))],
    [products]
  )

  const filtered = useMemo(() => {
    let list = category === ALL_CAT ? products : products.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    return list
  }, [products, category, search])

  const total      = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])
  const cartQty    = useCallback((id: string) => cart.find(i => i.product_id === id)?.qty ?? 0, [cart])

  function addToCart(product: Product) {
    if (product.stock === 0) return
    setCart(prev => {
      const hit = prev.find(i => i.product_id === product.id)
      if (hit) {
        if (product.stock > 0 && hit.qty >= product.stock) return prev
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, qty: 1, image_url: product.image_url }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev =>
      prev.map(i => i.product_id === productId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    )
  }

  function openPayment() {
    if (!cart.length) return
    setCashInput('')
    setSuccess(null)
    setPrintOrder(null)
    setPayMethod('cash')
    setPayOpen(true)
    setTimeout(() => cashRef.current?.focus(), 150)
  }

  function handleCashInput(v: string) {
    const digits = v.replace(/[^\d]/g, '')
    setCashInput(digits ? parseInt(digits).toLocaleString('id-ID') : '')
  }

  const cashAmount = parseCash(cashInput)
  const change     = cashAmount - total

  async function confirmPayment() {
    if (payMethod === 'cash' && cashAmount < total) {
      toast.error('Uang diterima kurang dari total')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/kasir/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product_id, name: i.name, price: i.price, qty: i.qty })),
          order_type: orderType,
          table_number: orderType === 'dine_in' ? (tableNumber || null) : null,
          payment_method: payMethod,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Gagal membuat order'); return }

      const order = json.order as Order
      setPrintOrder(order)
      setSuccess({ orderCode: order.order_code, change: payMethod === 'cash' ? change : 0, method: payMethod })
      setCart([])

      // EDC: auto-print receipt immediately
      if (payMethod === 'edc') {
        setTimeout(() => window.print(), 300)
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSubmitting(false)
    }
  }

  function closeDialog() {
    if (submitting) return
    setPayOpen(false)
    setSuccess(null)
    setPrintOrder(null)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden receipt — visible only when printing */}
      {printOrder && (
        <ReceiptPrint order={printOrder} storeName={storeName} footerText={footerText} />
      )}

      <div className="-mx-4 lg:-mx-6 -mb-4 lg:-mb-6 h-[calc(100vh-5.5rem)] lg:h-[calc(100vh-3rem)] flex overflow-hidden print:hidden">

        {/* ── LEFT: Menu Panel ────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 bg-gray-50">

          {/* Sticky header: search + categories */}
          <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 space-y-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari menu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 focus-visible:ring-gray-900 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    cat === category
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-white border border-gray-100 animate-pulse h-44" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                <Package className="h-8 w-8" />
                <p className="text-sm">Tidak ada produk ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(product => {
                  const qty = cartQty(product.id)
                  const outOfStock = product.stock === 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className={cn(
                        'relative rounded-xl bg-white border text-left transition-all overflow-hidden group',
                        outOfStock
                          ? 'border-gray-100 opacity-50 cursor-not-allowed'
                          : qty > 0
                            ? 'border-gray-900 ring-1 ring-gray-900 shadow-md'
                            : 'border-gray-200 hover:border-gray-400 hover:shadow-sm active:scale-[0.98] cursor-pointer'
                      )}
                    >
                      <div className="relative h-28 bg-gray-100">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <UtensilsCrossed className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                        {qty > 0 && (
                          <div className="absolute top-1.5 right-1.5 h-6 min-w-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center px-1 shadow">
                            {qty}
                          </div>
                        )}
                        {outOfStock && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border">Habis</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight min-h-[2rem]">
                          {product.name}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-1.5">{formatRupiah(product.price)}</p>
                      </div>
                      {!outOfStock && qty === 0 && (
                        <div className="absolute inset-0 bg-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="rounded-full bg-gray-900 text-white p-1.5 shadow-lg">
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart Panel ───────────────────────────────────────────── */}
        <div className="flex flex-col w-72 xl:w-80 shrink-0 bg-white border-l border-gray-200">

          <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gray-700" />
              <span className="font-semibold text-sm text-gray-900">Pesanan</span>
              {totalItems > 0 && (
                <span className="text-xs font-semibold bg-gray-900 text-white rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          <div className="shrink-0 px-4 py-3 border-b border-gray-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {([ ['dine_in', 'Dine In', UtensilsCrossed], ['take_away', 'Take Away', Package] ] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  onClick={() => setOrderType(val)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border transition-colors',
                    orderType === val
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {orderType === 'dine_in' && (
              <Input
                placeholder="No. meja (opsional)"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                className="h-8 text-sm bg-gray-50 border-gray-200 focus-visible:ring-gray-900"
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-10 text-gray-300">
                <ShoppingCart className="h-10 w-10" />
                <p className="text-sm font-medium text-gray-400">Keranjang kosong</p>
                <p className="text-xs text-gray-300">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {cart.map(item => (
                  <li key={item.product_id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatRupiah(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.product_id, -1)}
                        className="h-6 w-6 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-gray-900">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product_id, 1)}
                        className="h-6 w-6 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="w-16 text-right text-xs font-bold text-gray-900 shrink-0">
                      {formatRupiah(item.price * item.qty)}
                    </p>
                    <button
                      onClick={() => setCart(p => p.filter(i => i.product_id !== item.product_id))}
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 p-4 space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400">{totalItems} item</p>
                <p className="text-xs text-gray-400 mt-0.5">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatRupiah(total)}</p>
            </div>
            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Bayar {cart.length > 0 ? formatRupiah(total) : ''}
            </button>
          </div>
        </div>

        {/* ── Payment Dialog ──────────────────────────────────────────────── */}
        <Dialog open={payOpen} onOpenChange={open => !open && closeDialog()}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {success ? 'Pembayaran Berhasil!' : 'Konfirmasi Pembayaran'}
              </DialogTitle>
            </DialogHeader>

            {success ? (
              /* ── Success ── */
              <div className="flex flex-col items-center gap-4 pt-2 pb-1">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 font-mono">{success.orderCode}</p>
                  <p className="text-sm text-gray-500 mt-1">Order langsung dikirim ke dapur</p>
                </div>
                {success.change > 0 && (
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Kembalian</p>
                    <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatRupiah(success.change)}</p>
                  </div>
                )}
                {success.method === 'edc' && (
                  <p className="text-xs text-gray-400">Struk sedang dicetak...</p>
                )}
                <div className="w-full space-y-2">
                  {printOrder && (
                    <QzPrintButton order={printOrder} storeName={storeName} footerText={footerText} logoUrl={logoUrl} />
                  )}
                  <Button
                    className="w-full bg-gray-900 hover:bg-gray-800 h-11"
                    onClick={closeDialog}
                  >
                    Order Baru
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Payment Form ── */
              <div className="space-y-4 pt-1">
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-xl font-bold text-gray-900 tabular-nums">{formatRupiah(total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([['cash', 'Tunai', Banknote], ['edc', 'EDC / Debit', CreditCard]] as const).map(([val, label, Icon]) => (
                    <button
                      key={val}
                      onClick={() => { setPayMethod(val); setCashInput('') }}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold border transition-colors',
                        payMethod === val
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {payMethod === 'cash' ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Uang Diterima</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">Rp</span>
                        <Input
                          ref={cashRef}
                          value={cashInput}
                          onChange={e => handleCashInput(e.target.value)}
                          className="pl-10 h-12 text-lg font-bold focus-visible:ring-gray-900"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {quickAmounts(total).map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => setCashInput(value.toLocaleString('id-ID'))}
                          className="rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className={cn(
                      'rounded-xl border px-4 py-3 flex items-center justify-between transition-colors',
                      cashAmount === 0 ? 'border-gray-100 bg-gray-50'
                        : change >= 0 ? 'border-gray-200 bg-white'
                        : 'border-red-200 bg-red-50'
                    )}>
                      <span className="text-sm text-gray-500">Kembalian</span>
                      <span className={cn(
                        'text-xl font-bold tabular-nums',
                        cashAmount === 0 ? 'text-gray-300' : change < 0 ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {cashAmount === 0 ? '—' : change >= 0 ? formatRupiah(change) : `- ${formatRupiah(-change)}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center space-y-2">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-gray-100 p-3">
                        <CreditCard className="h-6 w-6 text-gray-500" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Proses pembayaran di mesin EDC</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Setelah pelanggan tap / gesek kartu dan mesin EDC berhasil, klik konfirmasi di bawah.
                      Struk akan otomatis dicetak.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-sm font-bold"
                  onClick={confirmPayment}
                  disabled={submitting || (payMethod === 'cash' && (cashAmount === 0 || change < 0))}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Memproses...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-2" />
                      {payMethod === 'cash' ? 'Konfirmasi Bayar' : 'Konfirmasi EDC Selesai'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
