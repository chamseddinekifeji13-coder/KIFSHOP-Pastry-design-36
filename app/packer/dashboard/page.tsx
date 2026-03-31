"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  Package, LogOut, RefreshCw, Clock, User, ShoppingBag,
  CheckCircle2, AlertCircle, Loader2, ChevronRight, Phone, MapPin, DollarSign
} from "lucide-react"

interface PackerSession {
  id: string
  name: string
  tenantId: string
}

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface PackerOrder {
  id: string
  customer_name: string
  customer_phone: string
  items: OrderItem[]
  total: number
  status: string
  created_at: string
  assigned_to: string | null
  assigned_at: string | null
  delivery_address: string
  notes: string | null
}

type ViewMode = "list" | "packing"

export default function PackerDashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<PackerSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [unassignedOrders, setUnassignedOrders] = useState<PackerOrder[]>([])
  const [myOrders, setMyOrders] = useState<PackerOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<PackerOrder | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [packingStartTime, setPackingStartTime] = useState<Date | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Check session on mount
  useEffect(() => {
    const stored = localStorage.getItem("packer_session")
    if (!stored) {
      router.push("/packer/login")
      return
    }
    
    try {
      const parsed = JSON.parse(stored) as PackerSession
      setSession(parsed)
    } catch {
      localStorage.removeItem("packer_session")
      router.push("/packer/login")
    }
  }, [router])

  // Timer for packing screen
  useEffect(() => {
    if (!packingStartTime) return
    
    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - packingStartTime.getTime()) / 1000)
      setElapsed(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [packingStartTime])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!session?.tenantId) return

    setIsRefreshing(true)
    const supabase = createClient()

    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("tenant_id", session.tenantId)
        .in("status", ["nouveau", "en_preparation", "ready_to_pack"])
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching orders:", error)
        return
      }

      const allOrders = (orders || []).map(o => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : [],
        delivery_address: o.delivery_address || "Adresse non disponible"
      })) as PackerOrder[]

      const unassigned = allOrders.filter(o => !o.assigned_to)
      const mine = allOrders.filter(o => o.assigned_to === session.id)

      setUnassignedOrders(unassigned)
      setMyOrders(mine)
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [session?.tenantId, session?.id])

  useEffect(() => {
    if (!session) return
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [session, fetchOrders])

  // Assign order to self
  const handleTakeOrder = async (order: PackerOrder) => {
    if (!session) return
    setActionLoading(order.id)

    const supabase = createClient()
    const now = new Date().toISOString()

    try {
      await supabase
        .from("orders")
        .update({
          assigned_to: session.id,
          assigned_at: now,
          status: "en_preparation",
          updated_at: now
        })
        .eq("id", order.id)

      setSelectedOrder({ ...order, assigned_to: session.id, assigned_at: now, status: "en_preparation" })
      setPackingStartTime(new Date())
      setViewMode("packing")
      setElapsed(0)
      fetchOrders()
    } catch (error) {
      console.error("Error taking order:", error)
    } finally {
      setActionLoading(null)
    }
  }

  // Continue packing an assigned order
  const handleContinuePacking = (order: PackerOrder) => {
    setSelectedOrder(order)
    setPackingStartTime(order.assigned_at ? new Date(order.assigned_at) : new Date())
    setViewMode("packing")
  }

  // Complete packing
  const handleCompletePacking = async () => {
    if (!selectedOrder || !session) return
    setActionLoading("complete")

    const supabase = createClient()
    const now = new Date()

    try {
      await supabase
        .from("orders")
        .update({
          status: "emballee",
          packed_by: session.id,
          packed_at: now.toISOString(),
          pack_duration_sec: elapsed,
          updated_at: now.toISOString()
        })
        .eq("id", selectedOrder.id)

      setSelectedOrder(null)
      setViewMode("list")
      setPackingStartTime(null)
      setElapsed(0)
      fetchOrders()
    } catch (error) {
      console.error("Error completing packing:", error)
    } finally {
      setActionLoading(null)
    }
  }

  // Report problem
  const handleReportProblem = async () => {
    if (!selectedOrder || !session) return
    alert("Problème signalé au gérant - À implémenter")
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("packer_session")
    router.push("/packer/login")
  }

  // Loading state
  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  // Packing screen - Mobile optimized
  if (viewMode === "packing" && selectedOrder) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        {/* Header with timer */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 safe-area-inset-top">
          <button 
            onClick={() => {
              setViewMode("list")
              setSelectedOrder(null)
            }}
            className="px-4 py-2 hover:bg-gray-100 active:bg-gray-200 rounded-xl font-medium transition touch-manipulation"
          >
            Retour
          </button>
          <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl">
            <Clock className="w-5 h-5" />
            <span className="text-xl font-mono font-bold tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </header>

        {/* Order details - scrollable */}
        <div className="flex-1 overflow-auto p-4 space-y-3 pb-safe">
          {/* Customer card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{selectedOrder.customer_name}</h2>
                {selectedOrder.customer_phone && (
                  <a 
                    href={`tel:${selectedOrder.customer_phone}`}
                    className="text-sm text-blue-600 flex items-center gap-1 mt-0.5"
                  >
                    <Phone className="w-4 h-4" />
                    {selectedOrder.customer_phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Total - prominent */}
          <div className="bg-green-600 rounded-2xl p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 opacity-80" />
                <span className="font-medium">Total a encaisser</span>
              </div>
              <p className="text-3xl font-bold">{selectedOrder.total} TND</p>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Adresse</p>
                <p className="font-medium text-sm">{selectedOrder.delivery_address}</p>
              </div>
            </div>
          </div>

          {/* Items list */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                Articles
              </h3>
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-sm font-bold">
                {selectedOrder.items.reduce((sum, i) => sum + i.quantity, 0)} pcs
              </span>
            </div>
            <div className="divide-y">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.price.toFixed(2)} TND</p>
                  </div>
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-lg ml-3">
                    x{item.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed action buttons at bottom */}
        <div className="border-t bg-white p-4 space-y-3 safe-area-inset-bottom">
          <button 
            onClick={handleCompletePacking}
            disabled={actionLoading === "complete"}
            className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 text-white font-bold rounded-2xl flex items-center justify-center gap-3 text-lg transition touch-manipulation shadow-lg shadow-green-600/30"
          >
            {actionLoading === "complete" ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
            Emballage termine
          </button>
          
          <button 
            onClick={handleReportProblem}
            className="w-full py-3 border-2 border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 font-medium rounded-2xl flex items-center justify-center gap-2 transition touch-manipulation"
          >
            <AlertCircle className="w-5 h-5" />
            Signaler un probleme
          </button>
        </div>
      </div>
    )
  }

  // Orders list view
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header - Mobile optimized */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-600 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base truncate">{session.name}</h1>
              <p className="text-xs text-gray-500">Emballeur</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={fetchOrders}
              disabled={isRefreshing}
              className="p-3 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition touch-manipulation disabled:opacity-50"
              aria-label="Actualiser"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 hover:bg-gray-100 active:bg-red-50 rounded-xl transition touch-manipulation"
              aria-label="Deconnexion"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-5 pb-safe">
        {/* My orders in progress */}
        {myOrders.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
              <Clock className="w-4 h-4 text-blue-600" />
              Mes commandes ({myOrders.length})
            </h2>
            <div className="space-y-3">
              {myOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleContinuePacking(order)}
                  disabled={actionLoading === order.id}
                  className="w-full bg-blue-50 rounded-2xl p-4 border-2 border-blue-200 active:bg-blue-100 active:border-blue-400 transition touch-manipulation text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate">{order.customer_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4" />
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          {order.total.toFixed(2)} TND
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold">
                      {actionLoading === order.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span className="text-sm">Continuer</span>
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Unassigned orders */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
            <ShoppingBag className="w-4 h-4 text-green-600" />
            Disponibles ({unassignedOrders.length})
          </h2>
          {unassignedOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <Package className="w-14 h-14 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Aucune commande</p>
              <p className="text-gray-400 text-sm mt-1">Tirez vers le bas pour actualiser</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassignedOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleTakeOrder(order)}
                  disabled={actionLoading === order.id}
                  className="w-full bg-white rounded-2xl p-4 border-2 border-gray-200 active:bg-green-50 active:border-green-400 transition touch-manipulation text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate">{order.customer_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4" />
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                        </span>
                        <span className="text-sm font-bold text-amber-600">
                          {order.total.toFixed(2)} TND
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-semibold">
                      {actionLoading === order.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span className="text-sm">Prendre</span>
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
