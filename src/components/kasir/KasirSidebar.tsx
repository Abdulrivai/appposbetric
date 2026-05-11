'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ClipboardList, BarChart2, LayoutDashboard, Package, Settings, LogOut } from 'lucide-react'
import { toast } from 'sonner'

const KASIR_NAV = [
  { href: '/kasir/antrian', icon: ClipboardList, label: 'Antrian Order' },
  { href: '/kasir/laporan', icon: BarChart2, label: 'Laporan Harian' },
]

const ADMIN_EXTRA_NAV = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard Admin' },
  { href: '/admin/produk', icon: Package, label: 'Produk' },
  { href: '/admin/pengaturan', icon: Settings, label: 'Pengaturan' },
]

interface KasirSidebarProps {
  role: 'cashier' | 'admin'
}

export function KasirSidebar({ role }: KasirSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil logout')
    router.push('/login')
  }

  const navItems = role === 'admin' ? [...KASIR_NAV, ...ADMIN_EXTRA_NAV] : KASIR_NAV

  return (
    <aside className="hidden w-64 flex-col border-r bg-white shadow-sm lg:flex print:hidden">
      <div className="p-6 border-b">
        <h2 className="font-bold text-lg">POS System</h2>
        <p className="text-xs text-muted-foreground capitalize">{role}</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
