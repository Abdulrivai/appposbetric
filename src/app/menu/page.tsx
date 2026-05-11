import { createServerSupabaseClient } from '@/lib/supabase-server'

export const revalidate = 30
import { Product } from '@/types'
import { MenuClient } from './MenuClient'

async function getProducts(): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, description, price, image_url, category, stock, is_active, created_at')
    .eq('is_active', true)
    .order('category')
    .order('name')
  return data ?? []
}

async function getStoreSettings(): Promise<{ storeName: string; logoUrl: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('store_settings')
    .select('store_name, logo_url')
    .single()
  return {
    storeName: data?.store_name ?? 'Toko Kami',
    logoUrl: data?.logo_url ?? null,
  }
}

export default async function MenuPage() {
  const [products, { storeName, logoUrl }] = await Promise.all([getProducts(), getStoreSettings()])

  return <MenuClient products={products} storeName={storeName} logoUrl={logoUrl} />
}
