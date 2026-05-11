'use client'

import { Order } from '@/types'
import { formatRupiah, formatDateTime } from '@/lib/utils'

// 58mm paper — RONGTA RPP02 (203 DPI, ~384 usable dots, 32 chars at normal size)
const COLS       = 32
const LOGO_WIDTH = 300   // max pixel width for logo on 58mm paper

// ── Raw byte helpers ─────────────────────────────────────────────────────────

const ESC = 0x1B
const GS  = 0x1D

function b(...bytes: number[]): Uint8Array { return new Uint8Array(bytes) }

/** Encode string as Latin-1 bytes (each char → 1 byte). Safe for ESC/POS. */
function s(str: string): Uint8Array {
  const arr = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xFF
  return arr
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) { out.set(p, offset); offset += p.length }
  return out
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

// ── ESC/POS commands ─────────────────────────────────────────────────────────

const CMD = {
  init:        b(ESC, 0x40),
  alignLeft:   b(ESC, 0x61, 0x00),
  alignCenter: b(ESC, 0x61, 0x01),
  bold:        b(ESC, 0x45, 0x01),
  boldOff:     b(ESC, 0x45, 0x00),
  dblHeight:   b(ESC, 0x21, 0x10),
  dblBoth:     b(ESC, 0x21, 0x30),
  normal:      b(ESC, 0x21, 0x00),
  cutPartial:  b(GS,  0x56, 0x01),
  feed:        s('\n'),
}

function lineBytes(char = '-'): Uint8Array { return s(char.repeat(COLS) + '\n') }

function rowBytes(left: string, right: string, width = COLS): Uint8Array {
  const space = width - left.length - right.length
  if (space < 1) return s(left.slice(0, width - right.length - 1) + ' ' + right + '\n')
  return s(left + ' '.repeat(space) + right + '\n')
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

// ── Logo → ESC/POS raster (GS v 0) ──────────────────────────────────────────

async function logoToRasterBytes(url: string, maxWidth = LOGO_WIDTH): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.floor(img.width * scale)
      const h = Math.floor(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      const { data: px } = ctx.getImageData(0, 0, w, h)
      const bytesPerRow = Math.ceil(w / 8)
      const raster = new Uint8Array(bytesPerRow * h)

      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const i = (row * w + col) * 4
          const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
          if (lum < 128) raster[row * bytesPerRow + Math.floor(col / 8)] |= 1 << (7 - col % 8)
        }
      }

      // GS v 0: 1D 76 30 m xL xH yL yH [raster]
      const cmd = new Uint8Array(8 + raster.length)
      cmd[0] = GS; cmd[1] = 0x76; cmd[2] = 0x30; cmd[3] = 0x00
      cmd[4] = bytesPerRow & 0xFF;  cmd[5] = (bytesPerRow >> 8) & 0xFF
      cmd[6] = h & 0xFF;            cmd[7] = (h >> 8) & 0xFF
      cmd.set(raster, 8)
      resolve(cmd)
    }
    img.onerror = () => reject(new Error('Logo tidak bisa dimuat'))
    img.src = url
  })
}

// ── Receipt builder ──────────────────────────────────────────────────────────

export async function buildPrintData(
  order: Order,
  storeName: string,
  footerText = 'Terima kasih!',
  logoUrl?: string,
): Promise<{ type: string; format: string; data: string }> {
  const payLabel =
    order.payment_method === 'qris' ? 'QRIS' :
    order.payment_method === 'edc'  ? 'EDC/Debit' : 'Tunai'
  const typeLabel =
    order.order_type === 'dine_in'
      ? `Dine In - Meja ${order.table_number ?? '-'}`
      : 'Take Away'

  const parts: Uint8Array[] = [CMD.init, CMD.alignCenter]

  // Logo or store name text
  if (logoUrl) {
    try {
      parts.push(await logoToRasterBytes(logoUrl))
      parts.push(CMD.feed)
    } catch {
      parts.push(CMD.dblBoth, s(storeName.slice(0, 20) + '\n'), CMD.normal)
    }
  } else {
    parts.push(CMD.dblBoth, s(storeName.slice(0, 20) + '\n'), CMD.normal)
  }

  parts.push(
    s('='.repeat(COLS) + '\n'),
    CMD.feed,
    CMD.alignLeft,
    rowBytes('No. Order:', order.order_code),
    rowBytes('Waktu:', formatDateTime(order.created_at)),
    rowBytes('Tipe:', typeLabel),
    rowBytes('Bayar:', payLabel),
    lineBytes('-'),
    CMD.bold, s('PESANAN\n'), CMD.boldOff,
  )

  for (const item of order.items) {
    parts.push(
      s(truncate(item.name, COLS) + '\n'),
      rowBytes(`  ${item.qty} x ${formatRupiah(item.price)}`, formatRupiah(item.subtotal)),
    )
  }

  parts.push(
    lineBytes('='),
    CMD.bold, CMD.dblHeight,
    rowBytes('TOTAL', formatRupiah(order.total_amount)),
    CMD.normal, CMD.boldOff,
    lineBytes('='),
    CMD.alignCenter,
    s(footerText + '\n'),
    s('\n\n\n'),
    CMD.cutPartial,
  )

  return { type: 'raw', format: 'base64', data: uint8ToBase64(concat(...parts)) }
}

// ── QZ Tray connection ───────────────────────────────────────────────────────

let qzInstance: Awaited<typeof import('qz-tray')> | null = null

async function getQz() {
  if (typeof window === 'undefined') throw new Error('Server side')
  if (qzInstance) return qzInstance

  const m  = await import('qz-tray')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qz = ((m as any).default ?? m) as typeof m

  qz.security.setCertificatePromise((resolve: (cert: string) => void) => { resolve('') })
  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise(() => (resolve: (s: string) => void) => { resolve('') })

  qzInstance = qz
  return qz
}

export async function connectQz() {
  const qz = await getQz()
  if (!qz.websocket.isActive()) {
    try {
      await qz.websocket.connect({ retries: 2, delay: 0.5 })
    } catch (err) {
      qzInstance = null
      throw err
    }
  }
  return qz
}

export async function getQzPrinters(): Promise<string[]> {
  const qz     = await connectQz()
  const result = await qz.printers.find()
  return Array.isArray(result) ? result : [result]
}

export const PRINTER_STORAGE_KEY = 'qz_selected_printer'

export async function printReceipt(
  printerName: string,
  order: Order,
  storeName: string,
  footerText = 'Terima kasih!',
  logoUrl?: string,
) {
  const qz     = await connectQz()
  const config = qz.configs.create(printerName)
  const data   = await buildPrintData(order, storeName, footerText, logoUrl)
  await qz.print(config, [data])
}

/** One-click print — uses saved printer from localStorage */
export async function quickPrint(
  order: Order,
  storeName = 'Toko Kami',
  footerText = 'Terima kasih!',
  logoUrl?: string,
) {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(PRINTER_STORAGE_KEY) : null
  let printerName = saved ?? ''
  if (!printerName) {
    const list = await getQzPrinters()
    if (!list.length) throw new Error('Tidak ada printer ditemukan')
    printerName = list[0]
  }
  await printReceipt(printerName, order, storeName, footerText, logoUrl)
}
