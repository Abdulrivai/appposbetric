'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
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
    <div className="min-h-screen flex">

      {/* ── Kiri: foto + branding (desktop only) ─────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gray-950">
        {/* Foto background */}
        <Image
          src="/quickdeisgn.png"
          alt="Quick Cafe"
          fill
          sizes="55vw"
          className="object-cover"
          priority
        />

        {/* Layer overlay berlapis untuk depth */}
        <div className="absolute inset-0 bg-gray-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/60 to-transparent" />

        {/* Konten */}
        <div className="relative z-10 flex flex-col justify-between p-14 w-full h-full">

          {/* Atas: Logo — pojok kiri atas, ukuran kecil */}
          <div className="flex justify-start">
            <Image
              src="/logoquickputih.png"
              alt="Quick Cafe"
              width={100}
              height={40}
              className="h-10 w-auto object-contain"
              style={{ height: 'auto' }}
            />
          </div>

          {/* Bawah: teks + badge fitur */}
          <div className="space-y-8">

            {/* Tagline */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-white/40" />
                <span className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">Quick Cafe POS</span>
              </div>
              <h2 className="text-[2.75rem] font-black text-white leading-[1.1] tracking-tight">
                Semua pesanan,<br />satu dasbor.
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-[260px]">
                Pantau antrian, kelola menu, dan cetak struk — semuanya realtime dari browser.
              </p>
            </div>

            {/* Badge fitur */}
            <div className="flex flex-wrap gap-2">
              {['⚡ Realtime', '🧾 Cetak Struk', '📊 Laporan', '☕ Multi Menu'].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/50 backdrop-blur-sm"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kanan: form login ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-16 relative overflow-hidden">

        {/* Dekorasi lingkaran blur di background */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gray-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gray-200/60 blur-3xl" />

        <div className="relative w-full max-w-[380px]">

          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <Image
              src="/logoquick.png"
              alt="Quick Cafe"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
              style={{ height: 'auto' }}
            />
          </div>

          {/* Card form */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8">

            {/* Heading */}
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-6 rounded-full bg-gray-900" />
                <span className="text-[11px] font-bold tracking-[0.18em] text-gray-400 uppercase">Staff Login</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                Selamat datang<br />kembali 👋
              </h1>
              <p className="mt-1.5 text-sm text-gray-400">
                Masuk untuk lanjut ke dasbor
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@quickcafe.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-900 focus:bg-white disabled:opacity-50 transition-all duration-150"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-12 pl-4 pr-12 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-900 focus:bg-white disabled:opacity-50 transition-all duration-150"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-700 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-bold tracking-wide hover:bg-gray-700 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 flex items-center justify-center gap-2 mt-1"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Masuk...</>
                  : 'Masuk →'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Quick Cafe POS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
