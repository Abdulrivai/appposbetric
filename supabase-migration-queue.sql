-- ============================================================
-- Migration: Tambah kolom queue_number pada tabel orders
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Tambah kolom queue_number (nullable agar kompatibel dengan order lama)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS queue_number TEXT;

-- Tambah index untuk pencarian cepat by queue_number + tanggal
CREATE INDEX IF NOT EXISTS idx_orders_queue_number ON orders (queue_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- Update RLS: izinkan publik baca order by queue_number (untuk halaman cek status)
-- Hapus policy lama jika ada, lalu buat yang baru yang lebih permisif untuk read publik
DROP POLICY IF EXISTS "orders_select_staff" ON orders;

-- Staff bisa baca semua order
CREATE POLICY "orders_select_staff" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'cashier')
    )
  );

-- Publik bisa baca order hari ini saja (untuk cek status antrian)
-- Catatan: API /api/status menggunakan service role, jadi policy ini opsional
-- tapi berguna jika suatu saat diakses langsung dari client
DROP POLICY IF EXISTS "orders_select_public_today" ON orders;
CREATE POLICY "orders_select_public_today" ON orders
  FOR SELECT USING (
    created_at >= CURRENT_DATE::timestamptz
  );
