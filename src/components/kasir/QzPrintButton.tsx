'use client'

import { useEffect, useState } from 'react'
import { Printer, ChevronDown, Loader2, AlertCircle, Check } from 'lucide-react'
import { Order } from '@/types'
import { getQzPrinters, printReceipt, PRINTER_STORAGE_KEY } from '@/lib/qz-print'
import { toast } from 'sonner'

interface QzPrintButtonProps {
  order: Order
  storeName: string
  footerText?: string
  logoUrl?: string
}

export function QzPrintButton({ order, storeName, footerText, logoUrl }: QzPrintButtonProps) {
  const [printers, setPrinters]     = useState<string[]>([])
  const [selected, setSelected]     = useState<string>('')
  const [loading, setLoading]       = useState(false)
  const [loadingPrn, setLoadingPrn] = useState(true)
  const [qzError, setQzError]       = useState(false)
  const [showDrop, setShowDrop]     = useState(false)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const list = await getQzPrinters()
        setPrinters(list)
        const saved = localStorage.getItem(PRINTER_STORAGE_KEY)
        setSelected(saved && list.includes(saved) ? saved : list[0] ?? '')
      } catch {
        setQzError(true)
      } finally {
        setLoadingPrn(false)
      }
    }
    load()
  }, [])

  function selectPrinter(name: string) {
    setSelected(name)
    localStorage.setItem(PRINTER_STORAGE_KEY, name)
    setShowDrop(false)
  }

  async function handlePrint() {
    if (!selected) return
    setLoading(true)
    setDone(false)
    try {
      await printReceipt(selected, order, storeName, footerText, logoUrl)
      setDone(true)
      toast.success('Struk berhasil dicetak!')
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      console.error('[QZ Print]', err)
      toast.error('Gagal mencetak. Pastikan QZ Tray aktif dan printer menyala.')
    } finally {
      setLoading(false)
    }
  }

  if (qzError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>QZ Tray tidak terdeteksi. Pastikan aplikasinya sudah berjalan.</span>
      </div>
    )
  }

  if (loadingPrn) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Memuat printer...</span>
      </div>
    )
  }

  if (printers.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Tidak ada printer ditemukan.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setShowDrop(v => !v)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors max-w-[180px]"
        >
          <Printer className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{selected || 'Pilih printer'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        </button>

        {showDrop && (
          <div className="absolute bottom-full mb-1.5 left-0 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {printers.map(p => (
              <button
                key={p}
                onClick={() => selectPrinter(p)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="truncate">{p}</span>
                {p === selected && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handlePrint}
        disabled={loading || !selected}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm disabled:pointer-events-none disabled:opacity-50 ${
          done ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" />
          : done  ? <Check className="h-4 w-4" />
          : <Printer className="h-4 w-4" />}
        {done ? 'Tercetak!' : 'Cetak Struk'}
      </button>
    </div>
  )
}
