"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  Package, 
  LogOut, 
  RefreshCw, 
  Clock, 
  User, 
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Phone,
  MapPin,
  DollarSign
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
    if (session) {
      fetchOrders()
      const interval = setInterval(fetchOrders, 30000)
      return () => clearInterval(interval)
    }
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
    alert("Probleme signale au gerant - A implementer")
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

  // Packing screen
  if (viewMode === "packing" && selectedOrder) {
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60

    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex-none bg-card border-b p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                setViewMode("list")
                setSelectedOrder(null)
              }}
              className="px-3 py-2 hover:bg-gray-100 rounded-lg transition"
            >
              Retour
            </button>
            <div className="flex items-center gap-2 text-lg font-mono font-bold text-blue-600">
              <Clock className="w-5 h-5" />
              <span>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        </header>

        {/* Order details */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Customer */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="font-bold text-lg">{selectedOrder.customer_name}</h2>
                {selectedOrder.customer_phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Phone className="w-4 h-4" />
                    {selectedOrder.customer_phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Adresse de livraison</p>
                <p className="font-medium">{selectedOrder.delivery_address}</p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-green-600">{selectedOrder.total} TND</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-gray-50 rounded-lg border overflow-hidden">
            <div className="p-3 bg-gray-100 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Articles ({selectedOrder.items.length})
              </h3>
            </div>
            <div className="divide-y">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.price.toFixed(2)} TND</p>
                  </div>
                  <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold text-lg">
                    x{item.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-none border-t p-4 space-y-3 bg-card">
          <button 
            onClick={handleCompletePacking}
            disabled={actionLoading === "complete"}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-lg transition"
          >
            {actionLoading === "complete" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Emballage termine
          </button>
          
          <button 
            onClick={handleReportProblem}
            className="w-full py-3 border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-lg flex items-center justify-center gap-2 transition"
          >
            <AlertCircle className="w-4 h-4" />
            Signaler un probleme
          </button>
        </div>
      </div>
    )
  }

  // Orders list view
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{session.name}</h1>
              <p className="text-xs text-gray-600">Emballeur</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchOrders}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* My orders in progress */}
        {myOrders.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Mes commandes en cours ({myOrders.length})
            </h2>
            <div className="space-y-3">
              {myOrders.map(order => (
                <div key={order.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{order.customer_name}</h3>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} articles
                      </p>
                      <p className="text-sm font-bold text-blue-600 mt-1">
                        {order.total.toFixed(2)} TND
                      </p>
                    </div>
                    <button
                      onClick={() => handleContinuePacking(order)}
                      disabled={actionLoading === order.id}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg flex items-center gap-1 transition"
                    >
                      {actionLoading === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Continuer
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Unassigned orders */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-green-600" />
            Commandes disponibles ({unassignedOrders.length})
          </h2>
          {unassignedOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600">Aucune commande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassignedOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg p-4 border hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{order.customer_name}</h3>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} articles
                      </p>
                      <p className="text-sm font-bold text-amber-600 mt-1">
                        {order.total.toFixed(2)} TND
                      </p>
                    </div>
                    <button
                      onClick={() => handleTakeOrder(order)}
                      disabled={actionLoading === order.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg flex items-center gap-1 transition"
                    >
                      {actionLoading === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Prendre
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
