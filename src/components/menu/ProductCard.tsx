'use client'

import Image from 'next/image'
import { Plus, Minus, ChefHat } from 'lucide-react'
import { Product } from '@/types'
import { useCartStore } from '@/lib/store'
import { formatRupiah } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  priority?: boolean
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { items, addItem, updateQty } = useCartStore()
  const cartItem = items.find((i) => i.product_id === product.id)
  const qty = cartItem?.qty ?? 0
  const isOutOfStock = product.stock === 0

  return (
    <div className={`group flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-200 ${
      isOutOfStock ? 'opacity-60' : 'hover:shadow-md hover:-translate-y-0.5'
    }`}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-50">
            <ChefHat className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
              Habis
            </span>
          </div>
        )}

        {qty > 0 && !isOutOfStock && (
          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow">
            {qty}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3 gap-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-gray-900">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed">{product.description}</p>
        )}
        <p className="mt-auto pt-2 text-sm font-bold text-gray-900">{formatRupiah(product.price)}</p>
      </div>

      {/* Cart control */}
      <div className="px-3 pb-3">
        {qty === 0 ? (
          <button
            disabled={isOutOfStock}
            onClick={() => addItem({ product_id: product.id, name: product.name, price: product.price, image_url: product.image_url })}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-700 disabled:pointer-events-none disabled:opacity-50 transition-colors active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        ) : (
          <div className="flex items-center justify-between gap-1 rounded-xl bg-gray-100 p-1">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors active:scale-95"
              onClick={() => updateQty(product.id, qty - 1)}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex-1 text-center text-sm font-bold text-gray-900">{qty}</span>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-700 shadow-sm transition-colors active:scale-95"
              onClick={() => updateQty(product.id, qty + 1)}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
