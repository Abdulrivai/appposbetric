'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, UtensilsCrossed } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error('Login gagal', { description: error.message }); return }
      if (!data.user) { toast.error('Login gagal', { description: 'User tidak ditemukan' }); return }

      const { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', data.user.id).single()

      if (roleData?.role === 'admin') router.push('/admin/dashboard')
      else if (roleData?.role === 'cashier') router.push('/kasir/antrian')
      else { toast.error('Akses ditolak', { description: 'Role tidak dikenali' }); await supabase.auth.signOut() }
    } catch {
      toast.error('Terjadi kesalahan, coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mb-3">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">POS System</h1>
          <p className="text-sm text-muted-foreground mt-1">Masuk ke dasbor kasir & admin</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" placeholder="email@toko.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Masuk...</> : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
