import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyMidtransSignature } from '@/lib/midtrans'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body

    // Verifikasi signature Midtrans untuk keamanan
    const isValid = verifyMidtransSignature(order_id, status_code, gross_amount, signature_key)

    if (!isValid) {
      console.error('Midtrans webhook: signature tidak valid', { order_id })
      return NextResponse.json({ error: 'Signature tidak valid' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Tentukan status baru berdasarkan transaction_status dari Midtrans
    let newStatus: string | null = null

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        newStatus = 'pending'
      } else {
        newStatus = 'paid'
      }
    } else if (transaction_status === 'pending') {
      newStatus = 'pending'
    } else if (
      transaction_status === 'expire' ||
      transaction_status === 'expired'
    ) {
      newStatus = 'expired'
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'failure'
    ) {
      newStatus = 'failed'
    }

    if (!newStatus) {
      return NextResponse.json({ message: 'Status tidak memerlukan update' })
    }

    // Update status order di database menggunakan midtrans_order_id
    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('midtrans_order_id', order_id)

    if (error) {
      console.error('Gagal update order dari webhook:', error)
      return NextResponse.json({ error: 'Gagal update order' }, { status: 500 })
    }

    console.log(`Webhook Midtrans: order ${order_id} → status ${newStatus}`)
    return NextResponse.json({ message: 'OK' })
  } catch (err) {
    console.error('Midtrans webhook error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
