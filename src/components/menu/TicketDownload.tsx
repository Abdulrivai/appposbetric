'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { toast } from 'sonner'

export interface TicketData {
  storeName: string
  orderCode: string
  queueNumber: string
  items: Array<{ name: string; qty: number; price: number }>
  total: number
  paymentMethod: string
  orderType: string
  tableNumber?: string
  createdAt: string
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSVG(d: TicketData): string {
  const W = 750
  const pad = 60
  const cx = W / 2

  const dateStr = new Date(d.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const payLabel =
    d.paymentMethod === 'qris' ? 'QRIS' :
    d.paymentMethod === 'edc'  ? 'EDC / Debit' : 'Tunai'
  const typeLabel =
    d.orderType === 'dine_in'
      ? `Dine In${d.tableNumber ? ` — Meja ${esc(d.tableNumber)}` : ''}`
      : 'Take Away'

  const showItems = d.items.slice(0, 3)
  const hasMore   = d.items.length > 3

  // Dynamic Y positions
  const ITEM_Y0  = 862
  const ITEM_GAP = 60
  const itemCount = showItems.length + (hasMore ? 1 : 0)
  const SEP2_Y   = ITEM_Y0 + itemCount * ITEM_GAP + 16
  const TOTAL_Y  = SEP2_Y + 62
  const FOOTER_Y = TOTAL_Y + 70
  const H        = FOOTER_Y + 88

  const itemRows = showItems.map((item, i) => {
    const y     = ITEM_Y0 + i * ITEM_GAP
    const name  = esc(item.name.length > 28 ? item.name.slice(0, 28) + '…' : item.name)
    const total = esc(formatRupiah(item.price * item.qty))
    const unit  = esc(formatRupiah(item.price))
    return `
  <text x="${pad}" y="${y}" fill="#374151" font-size="24" font-family="system-ui,-apple-system,sans-serif">${name}</text>
  <text x="${pad}" y="${y + 24}" fill="#9ca3af" font-size="20" font-family="system-ui,-apple-system,sans-serif">${item.qty}× ${unit}</text>
  <text x="${W - pad}" y="${y}" fill="#111827" font-size="24" font-weight="600" text-anchor="end" font-family="system-ui,-apple-system,sans-serif">${total}</text>`
  }).join('')

  const moreRow = hasMore
    ? `<text x="${cx}" y="${ITEM_Y0 + showItems.length * ITEM_GAP}" fill="#9ca3af" font-size="22" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif">+${d.items.length - 3} item lainnya...</text>`
    : ''

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="32" fill="white"/>

  <!-- Header -->
  <path d="M32,0 L${W - 32},0 Q${W},0 ${W},32 L${W},242 L0,242 L0,32 Q0,0 32,0 Z" fill="#111827"/>

  <!-- Header decorative circles -->
  <circle cx="${W - 60}" cy="121" r="130" fill="white" opacity="0.03"/>
  <circle cx="60" cy="80" r="70" fill="white" opacity="0.03"/>

  <!-- Store name -->
  <text x="${cx}" y="96" text-anchor="middle" fill="white" font-size="40" font-weight="700"
    font-family="system-ui,-apple-system,'Segoe UI',sans-serif">${esc(d.storeName.slice(0, 22))}</text>

  <!-- Subtitle -->
  <text x="${cx}" y="146" text-anchor="middle" fill="#6b7280" font-size="20" letter-spacing="8"
    font-family="system-ui,-apple-system,sans-serif">TIKET PESANAN</text>

  <!-- Order code pill -->
  <rect x="${cx - 130}" y="166" width="260" height="48" rx="10" fill="white" opacity="0.08"/>
  <text x="${cx}" y="197" text-anchor="middle" fill="#d1d5db" font-size="22"
    font-family="'Courier New',Courier,monospace">${esc(d.orderCode)}</text>

  <!-- Perforation -->
  <line x1="44" y1="242" x2="${W - 44}" y2="242" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="14,10"/>
  <circle cx="0"   cy="242" r="34" fill="#f8fafc"/>
  <circle cx="${W}" cy="242" r="34" fill="#f8fafc"/>

  <!-- Queue label -->
  <text x="${cx}" y="308" text-anchor="middle" fill="#9ca3af" font-size="20" letter-spacing="10"
    font-family="system-ui,-apple-system,sans-serif">NOMOR ANTRIAN</text>

  <!-- Queue box -->
  <rect x="60" y="322" width="${W - 120}" height="194" rx="24" fill="#f9fafb" stroke="#e5e7eb" stroke-width="2"/>

  <!-- Queue number -->
  <text x="${cx}" y="458" text-anchor="middle" fill="#111827" font-size="128" font-weight="700"
    font-family="'Courier New',Courier,monospace">${esc(d.queueNumber)}</text>

  <!-- Hint -->
  <text x="${cx}" y="540" text-anchor="middle" fill="#9ca3af" font-size="20"
    font-family="system-ui,-apple-system,sans-serif">Simpan tiket ini untuk memantau pesananmu</text>

  <!-- Separator 1 -->
  <line x1="${pad}" y1="572" x2="${W - pad}" y2="572" stroke="#f3f4f6" stroke-width="1.5"/>

  <!-- Detail rows -->
  <text x="${pad}" y="616" fill="#9ca3af" font-size="22" font-family="system-ui,-apple-system,sans-serif">Waktu</text>
  <text x="${W - pad}" y="616" fill="#374151" font-size="22" text-anchor="end" font-family="system-ui,-apple-system,sans-serif">${esc(dateStr)}</text>

  <text x="${pad}" y="662" fill="#9ca3af" font-size="22" font-family="system-ui,-apple-system,sans-serif">Pembayaran</text>
  <text x="${W - pad}" y="662" fill="#374151" font-size="22" text-anchor="end" font-family="system-ui,-apple-system,sans-serif">${esc(payLabel)}</text>

  <text x="${pad}" y="708" fill="#9ca3af" font-size="22" font-family="system-ui,-apple-system,sans-serif">Tipe</text>
  <text x="${W - pad}" y="708" fill="#374151" font-size="22" text-anchor="end" font-family="system-ui,-apple-system,sans-serif">${esc(typeLabel)}</text>

  <!-- Separator 2 -->
  <line x1="${pad}" y1="742" x2="${W - pad}" y2="742" stroke="#f3f4f6" stroke-width="1.5"/>

  <!-- Items heading -->
  <text x="${pad}" y="800" fill="#111827" font-size="26" font-weight="700"
    font-family="system-ui,-apple-system,sans-serif">Rincian Pesanan</text>

  <!-- Items -->
  ${itemRows}
  ${moreRow}

  <!-- Separator 3 -->
  <line x1="${pad}" y1="${SEP2_Y}" x2="${W - pad}" y2="${SEP2_Y}" stroke="#e5e7eb" stroke-width="1.5"/>

  <!-- Total -->
  <text x="${pad}" y="${TOTAL_Y}" fill="#111827" font-size="30" font-weight="700"
    font-family="system-ui,-apple-system,sans-serif">Total</text>
  <text x="${W - pad}" y="${TOTAL_Y}" fill="#111827" font-size="30" font-weight="700" text-anchor="end"
    font-family="system-ui,-apple-system,sans-serif">${esc(formatRupiah(d.total))}</text>

  <!-- Footer bg -->
  <path d="M0,${FOOTER_Y} L${W},${FOOTER_Y} L${W},${H - 32} Q${W},${H} ${W - 32},${H} L32,${H} Q0,${H} 0,${H - 32} Z"
    fill="#f9fafb"/>
  <line x1="0" y1="${FOOTER_Y}" x2="${W}" y2="${FOOTER_Y}" stroke="#f3f4f6" stroke-width="1.5"/>
  <text x="${cx}" y="${FOOTER_Y + 54}" text-anchor="middle" fill="#9ca3af" font-size="20"
    font-family="system-ui,-apple-system,sans-serif">Pantau status pesanan secara realtime</text>

</svg>`
}

async function downloadAsPng(svg: string, orderCode: string) {
  const blob   = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(blob)

  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(svgUrl)

      canvas.toBlob(pngBlob => {
        if (!pngBlob) { reject(new Error('Failed')); return }
        const url = URL.createObjectURL(pngBlob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = `tiket-${orderCode}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        resolve()
      }, 'image/png')
    }
    img.onerror = (e) => { URL.revokeObjectURL(svgUrl); reject(e) }
    img.src = svgUrl
  })
}

interface TicketDownloadProps {
  data: TicketData
}

export function TicketDownload({ data }: TicketDownloadProps) {
  const [loading, setLoading] = useState(false)

  const svgDataUrl = useMemo(() => {
    const svg = buildSVG(data)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [data])

  async function handleDownload() {
    setLoading(true)
    try {
      await downloadAsPng(buildSVG(data), data.orderCode)
    } catch {
      toast.error('Gagal download tiket, coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Ticket preview */}
      <div className="relative group cursor-pointer" onClick={handleDownload}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgDataUrl}
          alt="Tiket pesanan"
          className="w-48 rounded-2xl shadow-lg border border-gray-100 transition-transform group-hover:scale-[1.02]"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
          <Download className="h-6 w-6 text-white" />
          <span className="text-white text-xs font-semibold">Tap untuk download</span>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Download className="h-4 w-4" />}
        Download Tiket
      </button>
    </div>
  )
}
