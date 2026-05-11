import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const pathname = request.nextUrl.pathname

  // Ambil session user
  const { data: { user } } = await supabase.auth.getUser()

  // Route publik: lewatkan tanpa pengecekan
  if (pathname.startsWith('/menu') || pathname.startsWith('/api/midtrans')) {
    return response
  }

  // Route login: redirect ke dashboard jika sudah login
  if (pathname === '/login') {
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleData?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      if (roleData?.role === 'cashier') {
        return NextResponse.redirect(new URL('/kasir/antrian', request.url))
      }
    }
    return response
  }

  // Proteksi route /kasir/* — butuh session + role cashier atau admin
  if (pathname.startsWith('/kasir')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['cashier', 'admin'].includes(roleData.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Proteksi route /admin/* — butuh session + role admin saja
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/kasir/antrian', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/kasir/:path*',
    '/admin/:path*',
    '/login',
    '/menu/:path*',
  ],
}
