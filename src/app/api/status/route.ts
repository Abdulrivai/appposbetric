import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// API publik — tidak butuh login
// GET /api/status?queue=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queue = searchParams.get('queue')?.trim().toUpperCase()

    if (!queue) {
      return NextResponse.json({ error: 'Parameter queue diperlukan' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Cari order hari ini dengan queue_number tsb
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_code, queue_number, status, order_type, table_number, items, total_amount, created_at')
      .eq('queue_number', queue)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[/api/status] Supabase error:', error.message)
      // Jika kolom queue_number belum ada (migration belum dijalankan)
      if (error.message?.includes('queue_number')) {
        return NextResponse.json(
          { error: 'Fitur antrian belum aktif. Jalankan migration database terlebih dahulu.' },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Terjadi kesalahan database.' }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Nomor antrian tidak ditemukan. Pastikan nomor benar dan pesanan dibuat hari ini.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (err) {
    console.error('[/api/status] Unexpected error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
