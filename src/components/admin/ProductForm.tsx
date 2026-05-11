'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Product } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, X, ImageIcon, Tag, DollarSign, Layers } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Coffee', 'Non Coffee', 'Food', 'Dessert']

const CATEGORY_COLORS: Record<string, string> = {
  'Coffee':     'bg-amber-700 text-white border-amber-700',
  'Non Coffee': 'bg-sky-500 text-white border-sky-500',
  'Food':       'bg-orange-500 text-white border-orange-500',
  'Dessert':    'bg-rose-500 text-white border-rose-500',
}

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(100),
  description: z.string().optional(),
  price: z.number().min(1, 'Harga harus lebih dari 0'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  stock: z.number().min(-1),
  is_active: z.boolean(),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product
  onSuccess: () => void
  onCancel: () => void
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: product?.price ?? 0,
      category: product?.category ?? 'Coffee',
      stock: product?.stock ?? -1,
      is_active: product?.is_active ?? true,
    },
  })

  const selectedCategory = watch('category')
  const isActive = watch('is_active')
  const stockValue = watch('stock')

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2MB')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      setImageUrl(urlData.publicUrl)
      toast.success('Foto berhasil diupload')
    } catch {
      toast.error('Gagal upload foto')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: ProductFormData) {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const payload = { ...data, image_url: imageUrl }

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
        toast.success('Produk berhasil diupdate')
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        toast.success('Produk berhasil ditambahkan')
      }
      onSuccess()
    } catch {
      toast.error('Gagal menyimpan produk')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">

      {/* ── Image Upload ── */}
      <div className="relative">
        {imageUrl ? (
          <div className="relative h-44 w-full overflow-hidden rounded-2xl group">
            <Image src={imageUrl} alt="Preview" fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
              <label
                htmlFor="foto"
                className="cursor-pointer rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
              >
                {uploading ? <><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Uploading...</> : 'Ganti Foto'}
              </label>
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 p-1.5 text-white hover:bg-red-500/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="foto"
            className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-gray-400 hover:bg-gray-100 group"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="text-sm font-medium">Mengupload...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-gray-600 transition-colors">
                <div className="rounded-2xl bg-white border border-gray-200 p-3 shadow-sm group-hover:shadow">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Upload foto produk</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — maks 2MB</p>
                </div>
              </div>
            )}
          </label>
        )}
        <input
          id="foto"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
          disabled={uploading}
        />
      </div>

      {/* ── Nama ── */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Tag className="h-3.5 w-3.5" />
          Nama Produk <span className="text-red-400">*</span>
        </label>
        <Input
          {...register('name')}
          placeholder="Contoh: Nasi Goreng Spesial"
          className="rounded-xl"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* ── Kategori pills ── */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Layers className="h-3.5 w-3.5" />
          Kategori <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const active = selectedCategory === cat
            const colorClass = CATEGORY_COLORS[cat] ?? 'bg-gray-500 text-white border-gray-500'
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setValue('category', cat, { shouldValidate: true })}
                className={`rounded-full border px-3.5 py-1 text-sm font-medium transition-all ${
                  active
                    ? colorClass
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
        <input type="hidden" {...register('category')} />
        {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
      </div>

      {/* ── Harga + Stok ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <DollarSign className="h-3.5 w-3.5" />
            Harga <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">Rp</span>
            <Input
              type="number"
              {...register('price', { valueAsNumber: true })}
              placeholder="0"
              min={0}
              className="rounded-xl pl-9"
            />
          </div>
          {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block">Stok</label>
          <div className="flex gap-2">
            <Input
              type="number"
              {...register('stock', { valueAsNumber: true })}
              min={-1}
              disabled={stockValue === -1}
              className="rounded-xl"
            />
            <button
              type="button"
              onClick={() => setValue('stock', stockValue === -1 ? 0 : -1, { shouldValidate: true })}
              className={`shrink-0 rounded-xl border px-3 text-xs font-semibold transition-all ${
                stockValue === -1
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              ∞
            </button>
          </div>
          <p className="text-xs text-gray-400">{stockValue === -1 ? 'Stok tidak terbatas' : 'Masukkan jumlah stok'}</p>
        </div>
      </div>

      {/* ── Deskripsi ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block">
          Deskripsi <span className="font-normal normal-case text-gray-400">(opsional)</span>
        </label>
        <textarea
          {...register('description')}
          placeholder="Deskripsi singkat produk..."
          rows={2}
          className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground transition-all focus:border-gray-400 focus:ring-2 focus:ring-gray-200 shadow-sm"
        />
      </div>

      {/* ── Status aktif ── */}
      <button
        type="button"
        onClick={() => setValue('is_active', !isActive, { shouldValidate: true })}
        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
          isActive
            ? 'border-green-200 bg-green-50'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div>
          <p className={`text-sm font-semibold ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
            {isActive ? 'Produk Aktif' : 'Produk Nonaktif'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isActive ? 'Tampil di menu kasir' : 'Tersembunyi dari menu'}
          </p>
        </div>
        <div className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
          <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
        <input type="hidden" {...register('is_active')} />
      </button>

      {/* ── Buttons ── */}
      <div className="flex gap-3 pt-1">
        <Button
          type="submit"
          disabled={submitting || uploading}
          className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-700"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? 'Simpan Perubahan' : 'Tambah Produk'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl"
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
