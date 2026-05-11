'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Product } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { ProductForm } from '@/components/admin/ProductForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  UtensilsCrossed, Search, Package2, Sparkles, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  'Coffee':     { bg: 'bg-amber-700',  text: 'text-white' },
  'Non Coffee': { bg: 'bg-sky-500',    text: 'text-white' },
  'Food':       { bg: 'bg-orange-500', text: 'text-white' },
  'Dessert':    { bg: 'bg-rose-500',   text: 'text-white' },
}

function getCatStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? { bg: 'bg-gray-500', text: 'text-white' }
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | undefined>()
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchProducts() {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('id, name, description, price, image_url, category, stock, is_active').order('category').order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const categories = Array.from(new Set(products.map(p => p.category))).sort()

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.is_active : !p.is_active)
    return matchSearch && matchCat && matchStatus
  })

  const totalActive = products.filter(p => p.is_active).length
  const totalOutOfStock = products.filter(p => p.stock === 0).length

  async function handleDelete() {
    if (!deleteProduct) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', deleteProduct.id)
    if (error) {
      toast.error('Gagal menghapus produk')
    } else {
      toast.success('Produk dihapus')
      fetchProducts()
    }
    setDeleting(false)
    setDeleteProduct(null)
  }

  async function handleToggleActive(product: Product) {
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)
    if (error) {
      toast.error('Gagal update status')
    } else {
      toast.success(product.is_active ? 'Produk dinonaktifkan' : 'Produk diaktifkan')
      fetchProducts()
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 shadow-md">
              <Package2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-gray-900">Manajemen Produk</h1>
              <p className="text-xs text-gray-400">Kelola semua menu &amp; produk toko</p>
            </div>
          </div>

          {/* Inline stats */}
          {!loading && (
            <div className="flex items-center gap-4 text-sm pl-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-gray-500">{products.length} produk</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-gray-500">{totalActive} aktif</span>
              </span>
              {totalOutOfStock > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-red-500 font-medium">{totalOutOfStock} stok habis</span>
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={() => { setEditProduct(undefined); setDialogOpen(true) }}
          className="shrink-0 rounded-xl bg-gray-900 hover:bg-gray-700 shadow-md"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* ── Search + Status Filter ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Pills ── */}
      {!loading && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-gray-900 text-white shadow'
                : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            Semua
          </button>
          {categories.map(cat => {
            const style = getCatStyle(cat)
            const active = categoryFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(active ? 'all' : cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all shadow-sm ${
                  active
                    ? `${style.bg} ${style.text}`
                    : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Product Grid ── */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="rounded-2xl bg-gray-100 p-6">
            <UtensilsCrossed className="h-10 w-10 text-gray-300" />
          </div>
          <div>
            <p className="font-semibold text-gray-600">
              {search || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Tidak ada produk yang cocok'
                : 'Belum ada produk'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Coba ubah filter atau kata kunci'
                : 'Klik "Tambah" untuk menambahkan produk pertama'}
            </p>
          </div>
          {(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all') }}
              className="text-sm text-gray-900 underline underline-offset-2 font-medium"
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map(product => {
              const catStyle = getCatStyle(product.category)
              return (
                <div
                  key={product.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    !product.is_active ? 'opacity-60' : ''
                  }`}
                >
                  {/* Image area */}
                  <div className="relative h-44 shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <UtensilsCrossed className="h-10 w-10 text-gray-300" />
                      </div>
                    )}

                    {/* Gradient overlay always */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                    {/* Status dot */}
                    <div className={`absolute left-2.5 top-2.5 h-2.5 w-2.5 rounded-full shadow ${product.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />

                    {/* Category badge */}
                    <span className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catStyle.bg} ${catStyle.text} shadow`}>
                      {product.category}
                    </span>

                    {/* Stock habis overlay */}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                        <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow-lg flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Stok Habis
                        </span>
                      </div>
                    )}

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 bg-black/20">
                      <button
                        onClick={() => { setEditProduct(product); setDialogOpen(true) }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteProduct(product)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info area */}
                  <div className="flex flex-1 flex-col gap-2 p-3.5">
                    <div>
                      <p className="truncate font-semibold text-gray-900 text-sm leading-tight">{product.name}</p>
                      {product.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{product.description}</p>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-auto">
                      <span className="font-bold text-gray-900">{formatRupiah(product.price)}</span>
                      {product.stock !== -1 && product.stock > 0 && (
                        <span className="text-xs text-gray-400">{product.stock} pcs</span>
                      )}
                      {product.stock === -1 && (
                        <span className="text-xs text-gray-400">∞ stok</span>
                      )}
                    </div>

                    {/* Toggle row */}
                    <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className="flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                        title={product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {product.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-300" />
                        )}
                        <span className={`text-xs font-medium ${product.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                      <Sparkles className="h-3.5 w-3.5 text-gray-200" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length !== products.length && (
            <p className="text-center text-xs text-gray-400">
              Menampilkan {filtered.length} dari {products.length} produk &middot;{' '}
              <button
                onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all') }}
                className="font-medium text-gray-700 underline underline-offset-2"
              >
                lihat semua
              </button>
            </p>
          )}
        </>
      )}

      {/* ── Dialog Form ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Produk' : 'Produk Baru'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editProduct}
            onSuccess={() => { setDialogOpen(false); fetchProducts() }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={!!deleteProduct}
        onOpenChange={(v) => { if (!v) setDeleteProduct(null) }}
        title="Hapus Produk?"
        description={`Produk "${deleteProduct?.name}" akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        onConfirm={handleDelete}
        loading={deleting}
        destructive
      />
    </div>
  )
}
