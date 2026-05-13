'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/lib/store'
import { formatRupiah } from '@/lib/utils'
import { ShoppingCart, ArrowLeft, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { items, updateQty, removeItem, getTotalItems, getTotalPrice } = useCartStore()

  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gray-50 p-4">
        <Image
          src="/keranjangkosongnew.png"
          alt="Keranjang masih kosong"
          width={200}
          height={200}
          className="object-contain"
        />
        <div className="text-center">
          <p className="font-semibold text-gray-800">Keranjang masih kosong</p>
          <p className="text-sm text-gray-400 mt-1">Yuk, tambahkan menu dulu!</p>
        </div>
        <Link
          href="/menu"
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Menu
        </Link>
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
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-800" />
            <h1 className="text-lg font-bold text-gray-900">Keranjang</h1>
          </div>
          <span className="ml-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {totalItems} item
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 pb-32 space-y-3">
        {/* Item list */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden divide-y">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center gap-3 px-4 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatRupiah(item.price)} / item</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatRupiah(item.price * item.qty)}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
                  onClick={() => updateQty(item.product_id, item.qty - 1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-800">{item.qty}</span>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors active:scale-95"
                  onClick={() => updateQty(item.product_id, item.qty + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-1 active:scale-95"
                  onClick={() => removeItem(item.product_id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Ringkasan */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-2">
          <h2 className="font-semibold text-sm text-gray-800 mb-3">Ringkasan Pesanan</h2>
          {items.map((item) => (
            <div key={item.product_id} className="flex justify-between text-sm text-gray-500">
              <span className="line-clamp-1 flex-1">{item.name} <span className="text-gray-400">×{item.qty}</span></span>
              <span className="ml-3 font-medium text-gray-700">{formatRupiah(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">{formatRupiah(totalPrice)}</span>
          </div>
        </div>
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">{totalItems} item dipilih</p>
            <p className="text-lg font-bold text-gray-900">{formatRupiah(totalPrice)}</p>
          </div>
          <Link
            href="/menu/checkout"
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white hover:bg-gray-700 transition-colors active:scale-[0.98]"
          >
            Lanjut Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
