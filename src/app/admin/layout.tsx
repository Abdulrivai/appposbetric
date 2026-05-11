import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AppSidebar } from '@/components/shared/AppSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/kasir/antrian')

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar type="admin" title="POS Admin" subtitle="Administrator" />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
