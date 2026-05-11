import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Cek autentikasi dan role user (harus cashier atau admin)
    const authSupabase = await createServerSupabaseClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: roleData } = await authSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['cashier', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { action } = await request.json()
    const supabase = createServiceRoleClient()
    const orderId = params.id

    if (action === 'confirm_payment') {
      // Konfirmasi pembayaran tunai: set status paid
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          cashier_id: user.id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('status', 'waiting_payment') // Hanya untuk order yang menunggu

      if (error) {
        return NextResponse.json({ error: 'Gagal konfirmasi pembayaran' }, { status: 500 })
      }
    } else if (action === 'mark_done') {
      // Tandai order selesai/siap diambil
      const { error } = await supabase
        .from('orders')
        .update({ status: 'done' })
        .eq('id', orderId)

      if (error) {
        return NextResponse.json({ error: 'Gagal update status order' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update order error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authSupabase = await createServerSupabaseClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: roleData } = await authSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['cashier', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Gagal hapus order' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete order error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
