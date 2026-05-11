import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order_id')
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 })
  }

  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const baseUrl = isProd
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com'
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''

  const res = await fetch(`${baseUrl}/v2/${orderId}/status`, {
    headers: {
      Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
      Accept: 'application/json',
    },
  })

  const data = await res.json()
  const { transaction_status, fraud_status } = data

  let newStatus: string | null = null
  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    newStatus = fraud_status === 'challenge' ? 'pending' : 'paid'
  } else if (transaction_status === 'expire' || transaction_status === 'expired') {
    newStatus = 'expired'
  } else if (['cancel', 'deny', 'failure'].includes(transaction_status)) {
    newStatus = 'failed'
  }

  if (newStatus && newStatus !== 'pending') {
    const supabase = createServiceRoleClient()
    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid') updateData.paid_at = new Date().toISOString()

    await supabase
      .from('orders')
      .update(updateData)
      .eq('midtrans_order_id', orderId)
  }

  return NextResponse.json({ transaction_status, status: newStatus })
}
