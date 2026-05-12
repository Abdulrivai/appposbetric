'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Product } from '@/types'
import { ProductCard } from '@/components/menu/ProductCard'
import { CartDrawer } from '@/components/menu/CartDrawer'
import { BannerCarousel } from '@/components/menu/BannerCarousel'
import { Search, Receipt } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MenuClientProps {
  products: Product[]
  storeName: string
  logoUrl: string | null
}

const CATEGORIES = [
  { id: 'Coffee', label: '☕ Coffee' },
  { id: 'Non Coffee', label: '🧃 Non Coffee' },
  { id: 'Food', label: '🍱 Food' },
  { id: 'Dessert', label: '🍰 Dessert' },
]

export function MenuClient({ products, storeName }: MenuClientProps) {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('Coffee')
  const [queueInput, setQueueInput] = useState('')
  const [search, setSearch] = useState('')
  const [queueError, setQueueError] = useState('')
  const [queueChecking, setQueueChecking] = useState(false)

  const filtered = products.filter((p) => {
    const matchCategory = p.category === activeCategory
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    return matchCategory && matchSearch
  })

  async function handleCek() {
    const q = queueInput.trim().toUpperCase()
    if (!q) return

    setQueueChecking(true)
    setQueueError('')

    try {
      const res = await fetch(`/api/status?queue=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok || !data.order) {
        setQueueError('Nomor antrian tidak ditemukan. Pastikan nomor yang kamu masukkan benar.')
        return
      }

      // Ditemukan → navigasi ke halaman status
      router.push(`/menu/status?q=${encodeURIComponent(q)}`)
    } catch {
      setQueueError('Terjadi kesalahan koneksi. Coba lagi.')
    } finally {
      setQueueChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="mx-auto max-w-lg px-4 h-14 flex items-center justify-between gap-4">
          <Image
            src="/logoquick.png"
            alt={storeName}
            width={90}
            height={30}
            className="h-8 w-auto object-contain"
            style={{ height: 'auto' }}
            priority
          />
          <CartDrawer />
        </div>
      </header>

      {/* ── Hero area ───────────────────────────────────────────────── */}
      <div className="mx-auto max-w-lg px-4 pt-4 space-y-3">

        {/* Banner carousel */}
        <BannerCarousel />

        {/* ── Input nomor antrian + tombol Cek ────────────────────── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Receipt className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cek status pesanan, 1"
              value={queueInput}
              onChange={(e) => { setQueueInput(e.target.value.toUpperCase()); setQueueError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleCek()}
              maxLength={10}
              className={`w-full pl-10 pr-4 h-12 rounded-xl border bg-white text-sm font-mono font-semibold tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all uppercase shadow-sm ${queueError ? 'border-red-300' : 'border-gray-200'
                }`}
            />
          </div>
          <button
            onClick={handleCek}
            disabled={!queueInput.trim() || queueChecking}
            className="flex items-center gap-1.5 px-5 h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shadow-sm"
          >
            {queueChecking
              ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Cek</>
              : 'Cek'
            }
          </button>
        </div>

        {/* Pesan error nomor antrian */}
        {queueError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <span className="text-red-400 text-base">⚠️</span>
            <p className="text-xs text-red-600 font-medium">{queueError}</p>
          </div>
        )}

        {/* ── Search produk ───────────────────────────────────────── */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-10 h-11 rounded-xl bg-white border-gray-200 placeholder:text-gray-400 focus-visible:ring-gray-900 shadow-sm"
            placeholder="Cari menu favorit kamu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Sticky category strip ───────────────────────────────────── */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 mt-3">
        <div className="mx-auto max-w-lg overflow-x-auto scrollbar-none">
          <div className="flex gap-2 px-4 py-2.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  activeCategory === cat.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product grid ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-lg px-4 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Search className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">Menu tidak ditemukan</p>
            <p className="text-sm text-gray-400 text-center">Coba ubah kategori</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-gray-400 mb-3">
              {filtered.length} menu tersedia
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
