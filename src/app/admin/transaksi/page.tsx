'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Order } from '@/types'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Eye, Receipt, Trash2, TrendingUp, CreditCard, Wallet, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function StatCard({ label, value, sub, icon: Icon }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3">
      <div className="rounded-lg bg-gray-100 p-2.5 shrink-0">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function TransaksiPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPayment, setFilterPayment] = useState<string>('all')
  const [filterDateStart, setFilterDateStart] = useState(todayStr())
  const [filterDateEnd, setFilterDateEnd] = useState(todayStr())

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('orders')
      .select('id, order_code, queue_number, order_type, table_number, items, total_amount, payment_method, status, cashier_id, paid_at, created_at')
      .order('created_at', { ascending: false })

    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    if (filterPayment !== 'all') query = query.eq('payment_method', filterPayment)
    if (filterDateStart) query = query.gte('created_at', filterDateStart)
    if (filterDateEnd)   query = query.lte('created_at', filterDateEnd + 'T23:59:59')

    const { data } = await query.limit(200)
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [filterStatus, filterPayment, filterDateStart, filterDateEnd])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Stats hanya dari order yang berhasil dibayar
  const paidOrders = useMemo(() => orders.filter(o => o.status === 'paid' || o.status === 'done'), [orders])
  const totalPendapatan = useMemo(() => paidOrders.reduce((s, o) => s + o.total_amount, 0), [paidOrders])
  const qrisTotal = useMemo(() => paidOrders.filter(o => o.payment_method === 'qris').reduce((s, o) => s + o.total_amount, 0), [paidOrders])
  const cashTotal = useMemo(() => paidOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + o.total_amount, 0), [paidOrders])

  async function handleDelete() {
    if (!deleteOrder) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${deleteOrder.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Gagal menghapus transaksi'); return }
      toast.success('Transaksi dihapus')
      fetchOrders()
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setDeleting(false)
      setDeleteOrder(null)
    }
  }

  function setToday() {
    const t = todayStr()
    setFilterDateStart(t)
    setFilterDateEnd(t)
  }

  const isToday = filterDateStart === todayStr() && filterDateEnd === todayStr()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaksi &amp; Laporan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Riwayat transaksi &amp; ringkasan pendapatan</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <button
          onClick={setToday}
          className={`h-9 rounded-lg px-3.5 text-sm font-medium border transition-colors ${
            isToday ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          Hari Ini
        </button>

        <Input
          type="date"
          className="w-36 h-9 bg-white text-sm"
          value={filterDateStart}
          onChange={(e) => setFilterDateStart(e.target.value)}
        />
        <span className="text-muted-foreground text-sm">—</span>
        <Input
          type="date"
          className="w-36 h-9 bg-white text-sm"
          value={filterDateEnd}
          onChange={(e) => setFilterDateEnd(e.target.value)}
        />

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-40 h-9 bg-white">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="waiting_payment">Tunggu Bayar</SelectItem>
            <SelectItem value="paid">Dibayar</SelectItem>
            <SelectItem value="done">Selesai</SelectItem>
            <SelectItem value="expired">Kadaluarsa</SelectItem>
            <SelectItem value="failed">Gagal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPayment} onValueChange={(v) => setFilterPayment(v ?? 'all')}>
          <SelectTrigger className="w-36 h-9 bg-white">
            <SelectValue placeholder="Semua Bayar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bayar</SelectItem>
            <SelectItem value="qris">QRIS</SelectItem>
            <SelectItem value="cash">Tunai</SelectItem>
          </SelectContent>
        </Select>

        {(filterStatus !== 'all' || filterPayment !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-gray-600"
            onClick={() => { setFilterStatus('all'); setFilterPayment('all') }}
          >
            Reset filter
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Transaksi Berhasil" value={paidOrders.length} icon={ShoppingBag} />
          <StatCard label="Total Pendapatan" value={formatRupiah(totalPendapatan)} icon={TrendingUp} />
          <StatCard
            label="Via QRIS"
            value={formatRupiah(qrisTotal)}
            sub={`${paidOrders.filter(o => o.payment_method === 'qris').length} transaksi`}
            icon={CreditCard}
          />
          <StatCard
            label="Via Tunai"
            value={formatRupiah(cashTotal)}
            sub={`${paidOrders.filter(o => o.payment_method === 'cash').length} transaksi`}
            icon={Wallet}
          />
        </div>
      )}

      {/* Tabel */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">No.</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode Order</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bayar</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-4">
                          <Receipt className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-600">Tidak ada transaksi ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 font-mono text-xs font-black text-white">
                          {order.queue_number ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{order.order_code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs text-gray-600">
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-gray-100"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {order.status !== 'paid' && order.status !== 'done' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600 text-gray-400"
                              onClick={() => setDeleteOrder(order)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && orders.length > 0 && (
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground bg-gray-50/80">
            {orders.length} transaksi &middot; {paidOrders.length} berhasil
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Order: {selectedOrder?.order_code}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">No. Antrian</span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 font-mono text-base font-black text-white">
                  {selectedOrder.queue_number ?? '—'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Waktu:</span> <span className="font-medium">{formatDateTime(selectedOrder.created_at)}</span></div>
                <div><span className="text-muted-foreground">Tipe:</span> <span className="font-medium">{selectedOrder.order_type === 'dine_in' ? `Dine In - Meja ${selectedOrder.table_number}` : 'Take Away'}</span></div>
                <div><span className="text-muted-foreground">Pembayaran:</span> <span className="font-medium">{selectedOrder.payment_method === 'qris' ? 'QRIS' : selectedOrder.payment_method === 'edc' ? 'EDC' : 'Tunai'}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedOrder.status} /></div>
              </div>
              <div className="space-y-2 border-t pt-3">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.name} <span className="text-muted-foreground">×{item.qty}</span></span>
                    <span className="font-medium">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2 text-gray-900">
                  <span>Total</span>
                  <span>{formatRupiah(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteOrder}
        onOpenChange={(v) => { if (!v) setDeleteOrder(null) }}
        title="Hapus Transaksi?"
        description={`Transaksi ${deleteOrder?.order_code} akan dihapus secara permanen.`}
        confirmLabel="Ya, Hapus"
        onConfirm={handleDelete}
        loading={deleting}
        destructive
      />
    </div>
  )
}
