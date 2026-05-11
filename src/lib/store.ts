'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, OrderType } from '@/types'

interface CartStore {
  items: CartItem[]
  orderType: OrderType
  tableNumber: string

  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  setOrderType: (type: OrderType) => void
  setTableNumber: (number: string) => void

  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'dine_in',
      tableNumber: '',

      addItem: (item) => {
        const existing = get().items.find((i) => i.product_id === item.product_id)
        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.product_id === item.product_id ? { ...i, qty: i.qty + 1 } : i
            ),
          }))
        } else {
          set((state) => ({ items: [...state.items, { ...item, qty: 1 }] }))
        }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        }))
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product_id === productId ? { ...i, qty } : i
          ),
        }))
      },

      clearCart: () => set({ items: [], tableNumber: '' }),

      setOrderType: (type) => set({ orderType: type }),
      setTableNumber: (number) => set({ tableNumber: number }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: 'pos-cart' }
  )
)
