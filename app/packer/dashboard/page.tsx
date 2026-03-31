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
  Phone
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

interface PackerSession {
  id: string
  name: string
  phone: string
  tenant_id: string
  logged_in_at: string
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

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!session?.tenant_id) return

    setIsRefreshing(true)
    const supabase = createClient()

    try {
      // Fetch orders that are ready for packing (status = "nouveau" or "en-preparation")
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, items, total, status, created_at, assigned_to, assigned_at, notes")
        .eq("tenant_id", session.tenant_id)
        .in("status", ["nouveau", "en-preparation"])
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching orders:", error)
        return
      }

      const allOrders = (orders || []).map(o => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : []
      })) as PackerOrder[]

      // Split into unassigned and my orders
      const unassigned = allOrders.filter(o => !o.assigned_to && o.status === "nouveau")
      const mine = allOrders.filter(o => o.assigned_to === session.id)

      setUnassignedOrders(unassigned)
      setMyOrders(mine)
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [session?.tenant_id, session?.id])

  useEffect(() => {
    if (session) {
      fetchOrders()
      // Auto-refresh every 30 seconds
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

    const { error } = await supabase
      .from("orders")
      .update({
        assigned_to: session.id,
        assigned_at: now,
        status: "en-preparation",
        updated_at: now
      })
      .eq("id", order.id)

    if (error) {
      console.error("Error assigning order:", error)
      setActionLoading(null)
      return
    }

    // Record in history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      tenant_id: session.tenant_id,
      from_status: order.status,
      to_status: "en-preparation",
      changed_by: session.id,
      changed_by_name: session.name,
      note: `Commande prise par ${session.name}`
    })

    // Start packing
    setSelectedOrder({ ...order, assigned_to: session.id, assigned_at: now, status: "en-preparation" })
    setPackingStartTime(new Date())
    setViewMode("packing")
    setActionLoading(null)
    
    // Refresh orders list
    fetchOrders()
  }

  // Continue packing an already assigned order
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
    const durationSec = packingStartTime 
      ? Math.round((now.getTime() - packingStartTime.getTime()) / 1000)
      : 0

    const { error } = await supabase
      .from("orders")
      .update({
        status: "pret",
        packed_by: session.id,
        packed_at: now.toISOString(),
        pack_duration_sec: durationSec,
        updated_at: now.toISOString()
      })
      .eq("id", selectedOrder.id)

    if (error) {
      console.error("Error completing packing:", error)
      setActionLoading(null)
      return
    }

    // Record in history
    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      tenant_id: session.tenant_id,
      from_status: "en-preparation",
      to_status: "pret",
      changed_by: session.id,
      changed_by_name: session.name,
      note: `Emballage termine par ${session.name} en ${Math.floor(durationSec / 60)}min ${durationSec % 60}s`
    })

    setSelectedOrder(null)
    setViewMode("list")
    setPackingStartTime(null)
    setActionLoading(null)
    fetchOrders()
  }

  // Report problem
  const handleReportProblem = async () => {
    if (!selectedOrder || !session) return
    // For now, just add a note - could be expanded to a modal
    const supabase = createClient()
    
    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      tenant_id: session.tenant_id,
      from_status: null,
      to_status: "probleme-signale",
      changed_by: session.id,
      changed_by_name: session.name,
      note: `Probleme signale par ${session.name}`
    })

    alert("Probleme signale au gerant")
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
    const elapsed = packingStartTime 
      ? Math.round((Date.now() - packingStartTime.getTime()) / 1000)
      : 0
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60

    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex-none bg-card border-b p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setViewMode("list")
                setSelectedOrder(null)
              }}
            >
              Retour
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono font-bold">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        </header>

        {/* Order details */}
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {/* Customer info */}
          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{selectedOrder.customer_name}</h2>
                {selectedOrder.customer_phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedOrder.customer_phone}
                  </p>
                )}
              </div>
            </div>
            {selectedOrder.notes && (
              <div className="bg-warning/10 rounded-lg p-3 text-sm">
                <strong>Note:</strong> {selectedOrder.notes}
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="p-3 bg-muted/50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Articles ({selectedOrder.items.length})
              </h3>
            </div>
            <div className="divide-y">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.price.toFixed(2)} TND x {item.quantity}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold px-3">
                    x{item.quantity}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted/30 border-t flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-primary">
                {selectedOrder.total.toFixed(2)} TND
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-none p-4 bg-card border-t space-y-3">
          <Button 
            className="w-full h-16 text-lg font-semibold bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleCompletePacking}
            disabled={actionLoading === "complete"}
          >
            {actionLoading === "complete" ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2" />
            )}
            Emballage termine
          </Button>
          
          <Button 
            variant="outline"
            className="w-full h-12 border-destructive text-destructive hover:bg-destructive/10"
            onClick={handleReportProblem}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Signaler un probleme
          </Button>
        </div>
      </div>
    )
  }

  // Orders list view
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-none bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">{session.name}</h1>
              <p className="text-xs text-muted-foreground">Emballeur</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchOrders}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* My orders in progress */}
        {myOrders.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Mes commandes en cours ({myOrders.length})
            </h2>
            <div className="space-y-3">
              {myOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={() => handleContinuePacking(order)}
                  actionLabel="Continuer"
                  actionLoading={actionLoading === order.id}
                  highlight
                />
              ))}
            </div>
          </section>
        )}

        {/* Unassigned orders */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Commandes disponibles ({unassignedOrders.length})
          </h2>
          {unassignedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune commande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassignedOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={() => handleTakeOrder(order)}
                  actionLabel="Prendre"
                  actionLoading={actionLoading === order.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// Order card component
function OrderCard({
  order,
  onAction,
  actionLabel,
  actionLoading,
  highlight = false
}: {
  order: PackerOrder
  onAction: () => void
  actionLabel: string
  actionLoading: boolean
  highlight?: boolean
}) {
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div 
      className={`bg-card rounded-xl border p-4 transition-all ${
        highlight ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{order.customer_name}</h3>
            <Badge variant="secondary" className="shrink-0">
              {itemCount} article{itemCount > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
          </p>
          <p className="text-sm font-medium text-primary mt-1">
            {order.total.toFixed(2)} TND
          </p>
        </div>
        <Button
          size="sm"
          className={highlight ? "bg-primary" : ""}
          onClick={onAction}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {actionLabel}
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
