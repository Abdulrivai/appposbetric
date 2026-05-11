import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { generateOrderCode } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

    const { data: roleData } = await authSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['cashier', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const { items, order_type, table_number, payment_method } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'Item pesanan tidak boleh kosong' }, { status: 400 })
    }
    if (!['cash', 'edc'].includes(payment_method)) {
      return NextResponse.json({ error: 'Metode pembayaran tidak valid' }, { status: 400 })
    }

    const orderItems = items.map((i: { product_id: string; name: string; price: number; qty: number }) => ({
      product_id: i.product_id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      subtotal: i.price * i.qty,
    }))

    const total_amount = orderItems.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0)
    const order_code = generateOrderCode()

    const service = createServiceRoleClient()
    const { data: order, error } = await service
      .from('orders')
      .insert({
        order_code,
        items: orderItems,
        total_amount,
        status: 'paid',
        payment_method,
        order_type,
        table_number: order_type === 'dine_in' ? (table_number || null) : null,
        cashier_id: user.id,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Kasir order insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error('Kasir order error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
