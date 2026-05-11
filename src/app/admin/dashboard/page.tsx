import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Order, DailyStat } from '@/types'
import { formatRupiah, getTodayRange, getWeekRange, getMonthRange, formatDateTime } from '@/lib/utils'
import { StatsCard } from '@/components/admin/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, ShoppingBag, CreditCard, CalendarDays, LayoutDashboard } from 'lucide-react'

async function getDashboardData() {
  const supabase = await createServerSupabaseClient()

  const today = getTodayRange()
  const week  = getWeekRange()
  const month = getMonthRange()

  // Ambil 7 hari data dalam 1 query, lalu aggregate di JS — hindari N+1
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const ORDER_COLS = 'id, order_code, queue_number, order_type, table_number, items, total_amount, payment_method, status, cashier_id, paid_at, created_at'

  const [todayRes, weekRes, monthRes, recentRes, weekChartRes] = await Promise.all([
    supabase.from('orders').select('total_amount, payment_method').eq('status', 'paid').gte('created_at', today.start).lt('created_at', today.end),
    supabase.from('orders').select('total_amount').eq('status', 'paid').gte('created_at', week.start).lt('created_at', week.end),
    supabase.from('orders').select('total_amount').eq('status', 'paid').gte('created_at', month.start).lt('created_at', month.end),
    supabase.from('orders').select(ORDER_COLS).order('created_at', { ascending: false }).limit(10),
    supabase.from('orders').select('total_amount, payment_method, created_at').eq('status', 'paid').gte('created_at', weekStart.toISOString()),
  ])

  const todayOrders = todayRes.data ?? []
  const todayTotal  = todayOrders.reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)
  const weekTotal   = (weekRes.data ?? []).reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)
  const monthTotal  = (monthRes.data ?? []).reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)
  const qrisTotal   = todayOrders.filter((o: { payment_method?: string }) => o.payment_method === 'qris').reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)
  const cashTotal   = todayOrders.filter((o: { payment_method?: string }) => o.payment_method === 'cash').reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)

  // Aggregate 7-hari chart dari satu query
  const allWeekOrders = weekChartRes.data ?? []
  const chartData: DailyStat[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)

    const dayOrders = allWeekOrders.filter((o: { created_at: string }) => {
      const t = new Date(o.created_at)
      return t >= dayStart && t < dayEnd
    })

    const qris = dayOrders.filter((o: { payment_method?: string }) => o.payment_method === 'qris').reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)
    const cash = dayOrders.filter((o: { payment_method?: string }) => o.payment_method !== 'qris').reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0)

    chartData.push({
      date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      total: qris + cash,
      qris, cash,
      count: dayOrders.length,
    })
  }

  return {
    todayTotal, weekTotal, monthTotal,
    qrisTotal, cashTotal,
    todayCount: todayOrders.length,
    chartData,
    recentOrders: (recentRes.data ?? []) as Order[],
  }
}

export default async function DashboardPage() {
  const { todayTotal, weekTotal, monthTotal, qrisTotal, cashTotal, todayCount, chartData, recentOrders } = await getDashboardData()

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 shadow-md">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400">Ringkasan performa toko</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pendapatan Hari Ini"
          value={todayTotal}
          isRupiah
          icon={TrendingUp}
          description={`${todayCount} transaksi berhasil`}
        />
        <StatsCard title="Pendapatan Minggu Ini" value={weekTotal}  isRupiah icon={CalendarDays} />
        <StatsCard title="Pendapatan Bulan Ini"  value={monthTotal} isRupiah icon={ShoppingBag} />
        <StatsCard
          title="QRIS vs Tunai"
          value={`${formatRupiah(qrisTotal)} / ${formatRupiah(cashTotal)}`}
          icon={CreditCard}
          description="Hari ini"
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pendapatan 7 Hari Terakhir</h2>
          <p className="text-xs text-gray-400 mt-0.5">QRIS &amp; Tunai per hari</p>
        </div>
        <div className="p-4">
          <RevenueChart data={chartData} />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">10 Transaksi Terbaru</h2>
          <p className="text-xs text-gray-400 mt-0.5">Order masuk paling baru</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode Order</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Waktu</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              ) : (
                recentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-mono text-sm font-semibold">{order.order_code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                    <TableCell className="font-semibold">{formatRupiah(order.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
