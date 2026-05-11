'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { LogOut, Menu, LayoutDashboard, Package, Settings, ClipboardList, BarChart2, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const NAV_ITEMS: Record<'admin' | 'kasir', NavItem[]> = {
  admin: [
    { href: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/antrian',    icon: ClipboardList,   label: 'Antrian Order' },
    { href: '/admin/produk',     icon: Package,         label: 'Produk' },
    { href: '/admin/transaksi',  icon: BarChart2,       label: 'Transaksi & Laporan' },
    { href: '/admin/pengaturan', icon: Settings,        label: 'Pengaturan' },
  ],
  kasir: [
    { href: '/kasir/pos',     icon: ShoppingBag,   label: 'Kasir POS' },
    { href: '/kasir/antrian', icon: ClipboardList,  label: 'Antrian Order' },
    { href: '/kasir/laporan', icon: BarChart2,      label: 'Laporan Harian' },
  ],
}

interface AppSidebarProps {
  type: 'admin' | 'kasir'
  title: string
  subtitle: string
}

export function AppSidebar({ type, subtitle }: AppSidebarProps) {
  const navItems = NAV_ITEMS[type]
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil logout')
    router.push('/login')
  }

  function NavContent() {
    return (
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Image
            src="/logoquickputih.png"
            alt="Logo"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            style={{ height: 'auto' }}
            priority
          />
          <p className="text-xs text-gray-500 capitalize ml-auto">{subtitle}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    )
  }

  if (type === 'admin') {
    return (
      <aside className="flex w-60 shrink-0 flex-col bg-gray-900 border-r border-white/10 print:hidden">
        <NavContent />
      </aside>
    )
  }

  return (
    <>
      {/* Desktop sidebar — kasir */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-gray-900 border-r border-white/10 print:hidden">
        <NavContent />
      </aside>

      {/* Mobile topbar — kasir */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm px-4 print:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
          <SheetContent side="left" className="w-60 p-0 gap-0 bg-gray-900 border-r border-white/10" showCloseButton={false}>
            <NavContent />
          </SheetContent>
        </Sheet>

        <Image
          src="/logoquickputih.png"
          alt="Logo"
          width={90}
          height={24}
          className="h-6 w-auto object-contain"
          style={{ height: 'auto' }}
          priority
        />
      </div>
    </>
  )
}
