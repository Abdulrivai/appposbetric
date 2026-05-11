'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, QrCode, Printer, ImageIcon, X, Settings } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

const settingsSchema = z.object({
  store_name:          z.string().min(1, 'Nama toko wajib diisi'),
  primary_color:       z.string(),
  footer_text:         z.string().optional(),
  midtrans_server_key: z.string().optional(),
  midtrans_client_key: z.string().optional(),
  is_production:       z.boolean(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function PengaturanPage() {
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/menu`

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      store_name:          'Toko Saya',
      primary_color:       '#f97316',
      footer_text:         'Terima kasih telah berbelanja!',
      midtrans_server_key: '',
      midtrans_client_key: '',
      is_production:       false,
    },
  })

  const storeName = watch('store_name')

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('store_settings')
        .select('id, store_name, logo_url, primary_color, footer_text, midtrans_server_key, midtrans_client_key, is_production')
        .single()
      if (data) {
        setSettingsId(data.id)
        setLogoUrl(data.logo_url ?? null)
        reset({
          store_name:          data.store_name ?? 'Toko Saya',
          primary_color:       data.primary_color ?? '#f97316',
          footer_text:         data.footer_text ?? '',
          midtrans_server_key: data.midtrans_server_key ?? '',
          midtrans_client_key: data.midtrans_client_key ?? '',
          is_production:       data.is_production ?? false,
        })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [reset])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran file maksimal 2MB'); return }

    setLogoUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `logos/store-logo.${ext}`
      const { error: uploadError } = await supabase.storage.from('images').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      const url = publicUrl + '?t=' + Date.now()

      await supabase.from('store_settings').update({ logo_url: url }).eq('id', settingsId)
      setLogoUrl(url)
      toast.success('Logo berhasil diupload')
    } catch {
      toast.error('Gagal upload logo')
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    try {
      const supabase = createClient()
      await supabase.from('store_settings').update({ logo_url: null }).eq('id', settingsId)
      setLogoUrl(null)
      toast.success('Logo dihapus')
    } catch {
      toast.error('Gagal menghapus logo')
    }
  }

  async function onSubmit(data: SettingsFormData) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('store_settings').update(data).eq('id', settingsId)
      if (error) throw error
      toast.success('Pengaturan berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 shadow-md">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight text-gray-900">Pengaturan Toko</h1>
          <p className="text-xs text-gray-400">Konfigurasi informasi dan integrasi toko</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Info Toko */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Informasi Toko</h2>
          </div>
          <div className="p-5 space-y-4">

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo Toko</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-32 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <>
                      <Image src={logoUrl} alt="Logo" fill sizes="128px" className="object-contain p-2" />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 rounded-full bg-gray-900 p-0.5 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-7 w-7 text-gray-300" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-sm"
                  >
                    {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    {logoUploading ? 'Mengupload...' : 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-gray-400">PNG, JPG. Maks 2MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="store_name">Nama Toko *</Label>
              <Input id="store_name" {...register('store_name')} placeholder="Nama toko Anda" />
              {errors.store_name && <p className="text-xs text-red-500">{errors.store_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="footer_text">Teks Footer Struk</Label>
              <Input id="footer_text" {...register('footer_text')} placeholder="Terima kasih telah berbelanja!" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary_color">Warna Tema (hex)</Label>
              <div className="flex items-center gap-3">
                <Input id="primary_color" {...register('primary_color')} placeholder="#f97316" className="flex-1" />
                <input type="color" {...register('primary_color')} className="h-10 w-10 rounded-lg cursor-pointer border border-gray-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Midtrans */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Konfigurasi Midtrans</h2>
            <p className="text-xs text-gray-400 mt-0.5">API keys untuk pemrosesan pembayaran</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="midtrans_server_key">Server Key</Label>
              <Input id="midtrans_server_key" type="password" {...register('midtrans_server_key')} placeholder="SB-Mid-server-xxxx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="midtrans_client_key">Client Key</Label>
              <Input id="midtrans_client_key" {...register('midtrans_client_key')} placeholder="SB-Mid-client-xxxx" />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                id="is_production"
                type="checkbox"
                {...register('is_production')}
                className="h-4 w-4 rounded accent-gray-900 cursor-pointer"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Mode Production</p>
                <p className="text-xs text-gray-400">Nonaktifkan untuk mode Sandbox/Testing</p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60 disabled:pointer-events-none transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Pengaturan
        </button>
      </form>

      {/* QR Code */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code Menu
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Scan untuk membuka halaman menu pelanggan</p>
        </div>
        <div className="p-5 flex flex-col items-center gap-4">
          <div className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
            <QRCodeSVG value={menuUrl} size={180} level="H" marginSize={4} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{storeName}</p>
            <p className="text-xs text-gray-400 mt-1 break-all">{menuUrl}</p>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="border-gray-200 text-gray-700 hover:bg-gray-50">
            <Printer className="mr-2 h-4 w-4" />
            Cetak QR Code
          </Button>
        </div>
      </div>

    </div>
  )
}
