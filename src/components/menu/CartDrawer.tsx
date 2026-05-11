'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/store'

export function CartDrawer() {
  const [mounted, setMounted] = useState(false)
  const { getTotalItems } = useCartStore()

  useEffect(() => { setMounted(true) }, [])

  const totalItems = mounted ? getTotalItems() : 0

  return (
    <Link
      href="/menu/cart"
      className="relative flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors active:scale-95 shadow-sm"
    >
      <ShoppingBag className="h-4 w-4" />
      <span>Keranjang</span>
      {totalItems > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-gray-900 ring-2 ring-gray-900 shadow">
          {totalItems}
        </span>
      )}
    </Link>
  )
}
