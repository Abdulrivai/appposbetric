import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { createQRISCharge, extractQRString } from '@/lib/midtrans'
import { generateOrderCode } from '@/lib/utils'
import { CheckoutRequest } from '@/types'

async function generateQueueNumber(supabase: ReturnType<typeof createServiceRoleClient>): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Ambil semua queue_number hari ini lalu cari MAX secara numerik.
  // Pakai MAX bukan COUNT supaya penghapusan order expired tidak menyebabkan
  // nomor antrian yang sama diterbitkan ulang.
  const { data } = await supabase
    .from('orders')
    .select('queue_number')
    .gte('created_at', today.toISOString())

  const max = (data ?? []).reduce((m, o) => {
    const n = parseInt(o.queue_number ?? '0', 10)
    return n > m ? n : m
  }, 0)

  return String(max + 1)
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json()
    const { items, total_amount, order_type, table_number, payment_method } = body

    // Validasi input dasar
    if (!items?.length || !total_amount || !order_type || !payment_method) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    if (order_type === 'dine_in' && !table_number) {
      return NextResponse.json({ error: 'Nomor meja wajib diisi untuk Dine In' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const order_code = generateOrderCode()
    const queue_number = await generateQueueNumber(supabase)

    // Ambil pengaturan toko untuk mendapatkan server key Midtrans
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('midtrans_server_key, midtrans_client_key, is_production, store_name')
      .single()

    if (payment_method === 'qris') {
      // Gunakan server key dari DB jika ada, fallback ke env
      const serverKey = storeSettings?.midtrans_server_key || process.env.MIDTRANS_SERVER_KEY || ''
      if (!serverKey) {
        return NextResponse.json({ error: 'Midtrans server key belum dikonfigurasi' }, { status: 500 })
      }

      // Buat transaksi QRIS di Midtrans
      const midtransOrderId = `${order_code}-${Date.now()}`
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const chargeResponse = await createQRISCharge({
        payment_type: 'qris',
        transaction_details: {
          order_id: midtransOrderId,
          gross_amount: total_amount,
        },
        qris: { acquirer: 'gopay' },
        item_details: items.map((item) => ({
          id: item.product_id,
          price: item.price,
          quantity: item.qty,
          name: item.name.substring(0, 50),
        })),
        ...(appUrl && {
          notification: [`${appUrl}/api/midtrans/webhook`],
        }),
      })

      const qr_url = extractQRString(chargeResponse)

      // Simpan order ke database
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.price * item.qty,
      }))

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_code,
          queue_number,
          order_type,
          table_number: table_number || null,
          items: orderItems,
          total_amount,
          payment_method: 'qris',
          status: 'pending',
          qr_url,
          midtrans_order_id: midtransOrderId,
        })
        .select('id')
        .single()

      if (orderError) {
        console.error('Gagal simpan order QRIS:', orderError)
        return NextResponse.json({ error: 'Gagal menyimpan order' }, { status: 500 })
      }

      return NextResponse.json({
        order_id: order.id,
        order_code,
        queue_number,
        qr_url,
        midtrans_order_id: midtransOrderId,
      })
    }

    // Pembayaran tunai: langsung simpan dengan status waiting_payment
    if (payment_method === 'cash') {
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.price * item.qty,
      }))

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_code,
          queue_number,
          order_type,
          table_number: table_number || null,
          items: orderItems,
          total_amount,
          payment_method: 'cash',
          status: 'waiting_payment',
        })
        .select('id')
        .single()

      if (orderError) {
        console.error('Gagal simpan order tunai:', orderError)
        return NextResponse.json({ error: 'Gagal menyimpan order' }, { status: 500 })
      }

      return NextResponse.json({ order_id: order.id, order_code, queue_number })
    }

    return NextResponse.json({ error: 'Metode pembayaran tidak valid' }, { status: 400 })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
