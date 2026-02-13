"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useTenant } from "./tenant-context"
import { useStock } from "./stock-context"
import { getOrders, getSalesChannels, type Order } from "./mock-data"
import { toast } from "sonner"

export interface OrderNotification {
  id: string
  orderId: string
  customerName: string
  source: Order["source"]
  total: number
  timestamp: string
  read: boolean
}

interface OrderContextType {
  orders: Order[]
  notifications: OrderNotification[]
  unreadCount: number
  simulationActive: boolean
  addOrder: (order: Order) => void
  updateOrderStatus: (orderId: string, status: Order["status"]) => void
  updatePaymentStatus: (orderId: string, paymentStatus: Order["paymentStatus"]) => void
  dismissNotification: (notificationId: string) => void
  markAllNotificationsRead: () => void
  setSimulationActive: (active: boolean) => void
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

// Realistic Tunisian customer names for simulation
const SIMULATED_CUSTOMERS = [
  { name: "Salma Belhaj", phone: "+216 98 234 567" },
  { name: "Youssef Mansour", phone: "+216 55 345 678" },
  { name: "Rania Khelifi", phone: "+216 22 456 789" },
  { name: "Karim Bouazizi", phone: "+216 97 567 890" },
  { name: "Amira Gharbi", phone: "+216 55 678 901" },
  { name: "Mehdi Chaabane", phone: "+216 98 789 012" },
  { name: "Hana Trabelsi", phone: "+216 22 890 123" },
  { name: "Oussama Ferchichi", phone: "+216 55 901 234" },
  { name: "Imen Laabidi", phone: "+216 97 012 345" },
  { name: "Bilel Souissi", phone: "+216 98 123 789" },
]

const SIMULATED_ADDRESSES = [
  "Rue du Lac Biwa, Les Berges du Lac, Tunis",
  "Avenue Habib Bourguiba, Centre Ville, Tunis",
  "Cite Ennasr 2, Ariana",
  "Route de la Marsa, La Marsa",
  "Rue de Carthage, Sidi Bou Said",
  "Zone Industrielle, Ben Arous",
]

const SOURCE_LABELS: Record<Order["source"], string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  phone: "Telephone",
  web: "Site Web",
  instagram: "Instagram",
  comptoir: "Comptoir",
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant()
  const { finishedProducts, removeFinishedProductStock } = useStock()

  const [orders, setOrders] = useState<Order[]>(() =>
    getOrders(currentTenant.id).map(o => ({ ...o }))
  )
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const [simulationActive, setSimulationActive] = useState(true)

  const tenantRef = useRef(currentTenant.id)
  const productsRef = useRef(finishedProducts)

  // Keep refs up to date
  useEffect(() => {
    productsRef.current = finishedProducts
  }, [finishedProducts])

  // Reset orders when tenant changes
  useEffect(() => {
    tenantRef.current = currentTenant.id
    setOrders(getOrders(currentTenant.id).map(o => ({ ...o })))
    setNotifications([])
  }, [currentTenant.id])

  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev])

    // Create a notification
    const notification: OrderNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderId: order.id,
      customerName: order.customerName,
      source: order.source,
      total: order.total,
      timestamp: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => [notification, ...prev])
  }, [])

  const updateOrderStatus = useCallback((orderId: string, status: Order["status"]) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o
        const updated = { ...o, status }

        // When delivered, deduct finished products from stock
        if (status === "livre") {
          for (const item of updated.items) {
            const product = productsRef.current.find(p => p.id === item.productId)
            if (product) {
              removeFinishedProductStock(product.id, item.quantity)
            }
          }
        }

        return updated
      })
    )
  }, [removeFinishedProductStock])

  const updatePaymentStatus = useCallback((orderId: string, paymentStatus: Order["paymentStatus"]) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId ? { ...o, paymentStatus } : o
      )
    )
  }, [])

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Simulation: auto-generate orders from active channels
  useEffect(() => {
    if (!simulationActive) return

    const generateOrder = () => {
      const channels = getSalesChannels(tenantRef.current)
      const activeChannels = channels.filter(c => c.enabled && c.type !== "phone")
      if (activeChannels.length === 0) return

      const products = productsRef.current
      if (products.length === 0) return

      // Pick a random active channel
      const channel = activeChannels[Math.floor(Math.random() * activeChannels.length)]
      const source = channel.type as Order["source"]

      // Pick a random customer
      const customer = SIMULATED_CUSTOMERS[Math.floor(Math.random() * SIMULATED_CUSTOMERS.length)]

      // Pick 1-3 random products
      const numItems = Math.floor(Math.random() * 3) + 1
      const shuffled = [...products].sort(() => 0.5 - Math.random())
      const selectedProducts = shuffled.slice(0, numItems)

      const items = selectedProducts.map(p => ({
        productId: p.id,
        name: p.name,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: p.price,
      }))

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
      const isDelivery = Math.random() > 0.4
      const shippingCost = isDelivery ? [7, 8, 9, 10][Math.floor(Math.random() * 4)] : 0

      const newOrder: Order = {
        id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tenantId: tenantRef.current,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: isDelivery ? SIMULATED_ADDRESSES[Math.floor(Math.random() * SIMULATED_ADDRESSES.length)] : undefined,
        items,
        total: subtotal + shippingCost,
        deposit: 0,
        shippingCost: isDelivery ? shippingCost : undefined,
        status: "nouveau",
        deliveryType: isDelivery ? "delivery" : "pickup",
        source,
        paymentStatus: "unpaid",
        createdAt: new Date().toISOString(),
        deliveryDate: isDelivery
          ? new Date(Date.now() + (Math.floor(Math.random() * 3) + 1) * 86400000).toISOString().split("T")[0]
          : undefined,
      }

      addOrder(newOrder)

      toast.info(`Nouvelle commande via ${SOURCE_LABELS[source]}`, {
        description: `${customer.name} - ${newOrder.total.toLocaleString("fr-TN")} TND`,
        duration: 5000,
      })
    }

    // First order after 15-25s, then every 45-60s
    const initialDelay = Math.floor(Math.random() * 10000) + 15000
    const initialTimeout = setTimeout(() => {
      generateOrder()

      // Then recurring
      const interval = setInterval(() => {
        generateOrder()
      }, Math.floor(Math.random() * 15000) + 45000)

      // Store interval for cleanup
      ;(window as Record<string, unknown>).__kifshopInterval = interval
    }, initialDelay)

    return () => {
      clearTimeout(initialTimeout)
      const storedInterval = (window as Record<string, unknown>).__kifshopInterval as ReturnType<typeof setInterval> | undefined
      if (storedInterval) {
        clearInterval(storedInterval)
      }
    }
  }, [simulationActive, addOrder])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <OrderContext.Provider
      value={{
        orders,
        notifications,
        unreadCount,
        simulationActive,
        addOrder,
        updateOrderStatus,
        updatePaymentStatus,
        dismissNotification,
        markAllNotificationsRead,
        setSimulationActive,
      }}
    >
      {children}
    </OrderContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrderContext)
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrderProvider")
  }
  return context
}
