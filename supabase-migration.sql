-- ============================================================
-- POS System - Supabase SQL Migration
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabel produk
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'Umum',
  stock INTEGER DEFAULT -1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel order
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'take_away')),
  table_number TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('qris', 'cash', 'edc')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_payment', 'paid', 'done', 'expired', 'failed')),
  qr_url TEXT,
  midtrans_order_id TEXT,
  cashier_id UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel role pengguna
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  UNIQUE(user_id)
);

-- Tabel pengaturan toko
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT DEFAULT 'Toko Saya',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  footer_text TEXT DEFAULT 'Terima kasih telah berbelanja!',
  midtrans_server_key TEXT,
  midtrans_client_key TEXT,
  is_production BOOLEAN DEFAULT false
);

-- Insert default settings (hanya jika belum ada)
INSERT INTO store_settings (store_name)
SELECT 'Toko Saya'
WHERE NOT EXISTS (SELECT 1 FROM store_settings);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Products: publik bisa read, admin bisa CRUD
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_all_admin" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Orders: publik bisa insert, kasir/admin bisa read & update
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_select_staff" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'cashier')
    )
  );

CREATE POLICY "orders_update_staff" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'cashier')
    )
  );

-- User roles: hanya admin yang bisa manage
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_staff" ON user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_roles_all_admin" ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Store settings: publik bisa read, admin bisa update
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_settings_select_public" ON store_settings
  FOR SELECT USING (true);

CREATE POLICY "store_settings_update_admin" ON store_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Realtime
-- ============================================================

-- Aktifkan realtime untuk tabel orders (untuk notifikasi kasir dan pembeli)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================================
-- Storage
-- ============================================================

-- Buat bucket untuk foto produk (jalankan via Supabase Dashboard > Storage
-- atau via SQL di bawah jika menggunakan service role)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- ============================================================
-- Tambahkan EDC sebagai metode pembayaran (jika tabel sudah ada)
-- Jalankan blok ini di Supabase SQL Editor:
--
-- DO $$
-- DECLARE
--   cname TEXT;
-- BEGIN
--   SELECT conname INTO cname
--   FROM pg_constraint
--   WHERE conrelid = 'orders'::regclass
--     AND contype = 'c'
--     AND pg_get_constraintdef(oid) LIKE '%payment_method%';
--   IF cname IS NOT NULL THEN
--     EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(cname);
--   END IF;
-- END $$;
-- ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
--   CHECK (payment_method IN ('qris', 'cash', 'edc'));

-- ============================================================
-- Contoh: Buat user admin pertama
-- 1. Daftarkan user via Supabase Dashboard > Authentication > Users
-- 2. Copy user ID-nya
-- 3. Jalankan SQL berikut (ganti <USER_ID> dengan ID user):
-- INSERT INTO user_roles (user_id, role) VALUES ('<USER_ID>', 'admin');
-- ============================================================
