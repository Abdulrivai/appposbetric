import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Order } from '@/types'
import { formatRupiah, formatDateTime, getTodayRange } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatsCard } from '@/components/admin/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { TrendingUp, CreditCard, Wallet, ShoppingBag } from 'lucide-react'

async function getDailyReport() {
  const supabase = await createServerSupabaseClient()
  const { start, end } = getTodayRange()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_code, queue_number, order_type, table_number, items, total_amount, payment_method, status, cashier_id, paid_at, created_at')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })

  const list    = (orders as Order[]) ?? []
  const paid    = list.filter((o) => o.status === 'paid' || o.status === 'done')
  const total     = paid.reduce((s, o) => s + o.total_amount, 0)
  const qrisTotal = paid.filter((o) => o.payment_method === 'qris').reduce((s, o) => s + o.total_amount, 0)
  const cashTotal = paid.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + o.total_amount, 0)

  return { orders: list, paid, total, qrisTotal, cashTotal }
}

export default async function LaporanAdminPage() {
  const { orders, paid, total, qrisTotal, cashTotal } = await getDailyReport()

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Harian" description="Transaksi berhasil hari ini" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Transaksi Berhasil" value={paid.length} icon={ShoppingBag} />
        <StatsCard title="Total Pendapatan" value={total} isRupiah icon={TrendingUp} />
        <StatsCard
          title="Via QRIS"
          value={qrisTotal}
          isRupiah
          icon={CreditCard}
          description={`${paid.filter((o) => o.payment_method === 'qris').length} transaksi`}
        />
        <StatsCard
          title="Via Tunai"
          value={cashTotal}
          isRupiah
          icon={Wallet}
          description={`${paid.filter((o) => o.payment_method === 'cash').length} transaksi`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 opacity-20" />
              <p className="text-sm">Belum ada transaksi hari ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Kode Order</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Bayar</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 font-mono text-xs font-black text-white">
                          {order.queue_number ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{order.order_code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.order_type === 'dine_in' ? `Meja ${order.table_number}` : 'Take Away'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {order.payment_method === 'qris' ? 'QRIS' : order.payment_method === 'edc' ? 'EDC' : 'Tunai'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatRupiah(order.total_amount)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
