'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Order, OrderStatus } from '@/types'
import { OrderCard } from './OrderCard'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoreInfo { storeName: string; footerText: string; logoUrl: string }

const TABS = [
  { value: 'active',          label: 'Aktif',       statuses: ['pending', 'waiting_payment', 'paid'] as OrderStatus[] },
  { value: 'waiting_payment', label: 'Tunggu Bayar', statuses: ['pending', 'waiting_payment'] as OrderStatus[] },
  { value: 'paid',            label: 'Dibayar',      statuses: ['paid'] as OrderStatus[] },
  { value: 'done',            label: 'Selesai',      statuses: ['done'] as OrderStatus[] },
  { value: 'all',             label: 'Semua',        statuses: undefined },
]

export function OrderQueue() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab]   = useState('active')
  const [store, setStore]       = useState<StoreInfo>({ storeName: 'Toko Kami', footerText: 'Terima kasih!', logoUrl: '/logoquickcoffee.png' })

  async function autoExpireOldPending() {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await supabase
      .from('orders')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', cutoff)
  }

  async function fetchOrders(silent = false) {
    if (!silent) setRefreshing(true)
    await autoExpireOldPending()

    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('orders')
      .select('id, order_code, queue_number, order_type, table_number, items, total_amount, payment_method, status, cashier_id, paid_at, created_at')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(150)

    setOrders((data as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    createClient()
      .from('store_settings')
      .select('store_name, footer_text, logo_url')
      .single()
      .then(({ data }) => {
        if (data) setStore({
          storeName: data.store_name ?? 'Toko Kami',
          footerText: data.footer_text ?? 'Terima kasih!',
          logoUrl: data.logo_url ?? '/logoquickcoffee.png',
        })
      })

    fetchOrders(true)

    const supabase = createClient()
    const channel = supabase
      .channel('orders-realtime-kasir')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders(true))
      .subscribe()

    // Auto-expire check every 60s even without realtime events
    const interval = setInterval(() => fetchOrders(true), 60 * 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  function getFiltered(tab: typeof TABS[number]) {
    if (!tab.statuses) return orders
    return orders.filter((o) => tab.statuses!.includes(o.status))
  }

  const currentTab = TABS.find((t) => t.value === activeTab) ?? TABS[0]
  const filtered = getFiltered(currentTab)

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tab) => {
          const count = getFiltered(tab).length
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800 bg-white'
              )}
            >
              {tab.label}
              <span className={cn(
                'min-w-[1.2rem] rounded-full text-center text-xs font-bold px-1',
                isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
              )}>
                {count}
              </span>
            </button>
          )
        })}

        <button
          onClick={() => fetchOrders()}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-muted-foreground hover:border-gray-300 hover:text-foreground transition-all"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Grid order cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <ShoppingBag className="h-10 w-10 opacity-30" />
          <p className="text-sm">Tidak ada order {currentTab.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onUpdate={() => fetchOrders(true)} storeName={store.storeName} footerText={store.footerText} logoUrl={store.logoUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
