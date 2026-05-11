import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AppSidebar } from '@/components/shared/AppSidebar'

export default async function KasirLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || !['cashier', 'admin'].includes(roleData.role)) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar type="kasir" title="POS Kasir" subtitle={roleData.role} />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-4 lg:p-6 pt-[4.5rem] lg:pt-6">{children}</div>
      </main>
    </div>
  )
}
