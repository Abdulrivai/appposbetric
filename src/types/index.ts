export type OrderStatus =
  | 'pending'
  | 'waiting_payment'
  | 'paid'
  | 'done'
  | 'expired'
  | 'failed'

export type OrderType = 'dine_in' | 'take_away'
export type PaymentMethod = 'qris' | 'cash' | 'edc'
export type UserRole = 'admin' | 'cashier'

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string
  stock: number
  is_active: boolean
  created_at: string
}

export interface OrderItem {
  product_id: string
  name: string
  price: number
  qty: number
  subtotal: number
}

export interface Order {
  id: string
  order_code: string
  queue_number: string
  order_type: OrderType
  table_number: string | null
  items: OrderItem[]
  total_amount: number
  payment_method: PaymentMethod
  status: OrderStatus
  qr_url: string | null
  midtrans_order_id: string | null
  cashier_id: string | null
  paid_at: string | null
  created_at: string
}

export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
}

export interface StoreSettings {
  id: string
  store_name: string
  logo_url: string | null
  primary_color: string
  footer_text: string
  midtrans_server_key: string | null
  midtrans_client_key: string | null
  is_production: boolean
}

export interface CartItem {
  product_id: string
  name: string
  price: number
  qty: number
  image_url: string | null
}

export interface CheckoutRequest {
  items: { product_id: string; name: string; price: number; qty: number }[]
  total_amount: number
  order_type: OrderType
  table_number?: string
  payment_method: PaymentMethod
}

export interface DailyStat {
  date: string
  total: number
  qris: number
  cash: number
  count: number
}
