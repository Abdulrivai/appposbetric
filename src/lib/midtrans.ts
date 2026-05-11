import crypto from 'crypto'

const MIDTRANS_BASE_URL_SANDBOX = 'https://api.sandbox.midtrans.com'
const MIDTRANS_BASE_URL_PRODUCTION = 'https://api.midtrans.com'

function getBaseUrl(): string {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  return isProd ? MIDTRANS_BASE_URL_PRODUCTION : MIDTRANS_BASE_URL_SANDBOX
}

function getServerKey(): string {
  return process.env.MIDTRANS_SERVER_KEY || ''
}

function getAuthHeader(): string {
  return `Basic ${Buffer.from(getServerKey() + ':').toString('base64')}`
}

export interface MidtransChargePayload {
  payment_type: 'qris'
  transaction_details: {
    order_id: string
    gross_amount: number
  }
  qris: {
    acquirer: 'gopay'
  }
  customer_details?: {
    first_name?: string
    email?: string
    phone?: string
  }
  item_details?: {
    id: string
    price: number
    quantity: number
    name: string
  }[]
  notification?: string[]
}

export interface MidtransQRISResponse {
  status_code: string
  status_message: string
  transaction_id: string
  order_id: string
  gross_amount: string
  payment_type: string
  transaction_time: string
  transaction_status: string
  actions: { name: string; method: string; url: string }[]
  qr_string?: string
  currency?: string
}

// Buat transaksi QRIS via Midtrans Core API
export async function createQRISCharge(
  payload: MidtransChargePayload
): Promise<MidtransQRISResponse> {
  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/v2/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.status_message || 'Gagal membuat transaksi Midtrans')
  }

  return response.json()
}

// Verifikasi signature notifikasi Midtrans
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = getServerKey()
  const rawString = orderId + statusCode + grossAmount + serverKey
  const expectedSignature = crypto
    .createHash('sha512')
    .update(rawString)
    .digest('hex')
  return expectedSignature === signatureKey
}

// Ambil QR string dari response Midtrans (untuk di-render client-side)
export function extractQRString(response: MidtransQRISResponse): string {
  return response.qr_string || ''
}
