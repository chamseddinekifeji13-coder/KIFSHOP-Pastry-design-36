"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ArrowLeft,
  CircleDot,
  Filter,
  Building2,
  XCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  Package,
  DollarSign,
  ShoppingCart,
  Settings2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAllTickets,
  getTicketMessages,
  replyToTicket,
  updateTicketStatus,
  getTenantProducts,
  getTenantOrders,
  adminCorrectStock,
  adminCorrectPrice,
  adminCorrectOrder,
  type AdminTicketOverview,
  type AdminTicketMessage,
  type TenantProduct,
  type TenantOrder,
} from "@/lib/super-admin/actions"

// ─── Labels ────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Resolu",
  closed: "Ferme",
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  bug: "Bug",
  billing: "Facturation",
  feature_request: "Fonctionnalite",
  account: "Compte",
}

const TYPE_LABELS: Record<string, string> = {
  raw_material: "Matiere premiere",
  finished_product: "Produit fini",
  packaging: "Emballage",
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  "en-preparation": "En preparation",
  pret: "Pret",
  "en-livraison": "En livraison",
  livre: "Livre",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paye",
  unpaid: "Non paye",
  partial: "Partiel",
}

// ─── Badge components ──────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: typeof CircleDot }> = {
    open: { className: "bg-chart-1/10 text-chart-1 border-chart-1/20", icon: CircleDot },
    in_progress: { className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    resolved: { className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    closed: { className: "bg-muted text-muted-foreground border-border", icon: XCircle },
  }
  const { className, icon: Icon } = config[status] || config.open
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    low: "bg-muted text-muted-foreground border-border",
    normal: "bg-primary/10 text-primary border-primary/20",
    high: "bg-warning/10 text-warning border-warning/20",
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config[priority] || config.normal}`}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  )
}

// ─── Correction Panel ──────────────────────────────────────
function CorrectionPanel({
  ticket,
  onCorrectionApplied,
}: {
  ticket: AdminTicketOverview
  onCorrectionApplied: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [orders, setOrders] = useState<TenantOrder[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [applying, setApplying] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // Stock correction state
  const [stockItemId, setStockItemId] = useState("")
  const [stockNewQty, setStockNewQty] = useState("")
  const [stockReason, setStockReason] = useState("")

  // Price correction state
  const [priceItemId, setPriceItemId] = useState("")
  const [priceNewValue, setPriceNewValue] = useState("")
  const [priceField, setPriceField] = useState<"selling" | "cost" | "unit">("selling")
  const [priceReason, setPriceReason] = useState("")

  // Order correction state
  const [orderId, setOrderId] = useState("")
  const [orderNewTotal, setOrderNewTotal] = useState("")
  const [orderNewStatus, setOrderNewStatus] = useState("")
  const [orderNewPayment, setOrderNewPayment] = useState("")
  const [orderReason, setOrderReason] = useState("")

  const loadData = useCallback(async () => {
    if (loadingData || products.length > 0) return
    setLoadingData(true)
    try {
      const [p, o] = await Promise.all([
        getTenantProducts(ticket.tenant_id),
        getTenantOrders(ticket.tenant_id),
      ])
      setProducts(p)
      setOrders(o)
    } catch (err) {
      console.error("Failed to load tenant data:", err)
    } finally {
      setLoadingData(false)
    }
  }, [ticket.tenant_id, loadingData, products.length])

  function handleOpen() {
    const next = !isOpen
    setIsOpen(next)
    if (next) loadData()
  }

  function showFeedback(type: "success" | "error", msg: string) {
    if (type === "success") {
      setSuccessMsg(msg)
      setErrorMsg("")
      setTimeout(() => setSuccessMsg(""), 4000)
    } else {
      setErrorMsg(msg)
      setSuccessMsg("")
      setTimeout(() => setErrorMsg(""), 5000)
    }
  }

  const selectedStockProduct = products.find((p) => p.id === stockItemId)
  const selectedPriceProduct = products.find((p) => p.id === priceItemId)
  const selectedOrder = orders.find((o) => o.id === orderId)

  async function handleStockCorrection() {
    if (!stockItemId || !stockNewQty.trim() || !stockReason.trim()) return
    const product = products.find((p) => p.id === stockItemId)
    if (!product) return

    setApplying(true)
    try {
      await adminCorrectStock(ticket.id, ticket.tenant_id, product.type, stockItemId, Number(stockNewQty), stockReason)
      showFeedback("success", `Stock de "${product.name}" corrige avec succes`)
      setStockItemId("")
      setStockNewQty("")
      setStockReason("")
      // Refresh products
      const p = await getTenantProducts(ticket.tenant_id)
      setProducts(p)
      onCorrectionApplied()
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erreur lors de la correction")
    } finally {
      setApplying(false)
    }
  }

  async function handlePriceCorrection() {
    if (!priceItemId || !priceNewValue.trim() || !priceReason.trim()) return
    const product = products.find((p) => p.id === priceItemId)
    if (!product) return

    setApplying(true)
    try {
      await adminCorrectPrice(ticket.id, ticket.tenant_id, product.type, priceItemId, Number(priceNewValue), priceField, priceReason)
      showFeedback("success", `Prix de "${product.name}" corrige avec succes`)
      setPriceItemId("")
      setPriceNewValue("")
      setPriceReason("")
      const p = await getTenantProducts(ticket.tenant_id)
      setProducts(p)
      onCorrectionApplied()
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erreur lors de la correction")
    } finally {
      setApplying(false)
    }
  }

  async function handleOrderCorrection() {
    if (!orderId || !orderReason.trim()) return

    const updates: { total?: number; status?: string; paymentStatus?: string } = {}
    if (orderNewTotal.trim()) updates.total = Number(orderNewTotal)
    if (orderNewStatus) updates.status = orderNewStatus
    if (orderNewPayment) updates.paymentStatus = orderNewPayment

    if (Object.keys(updates).length === 0) return

    setApplying(true)
    try {
      await adminCorrectOrder(ticket.id, orderId, updates, orderReason)
      showFeedback("success", "Commande corrigee avec succes")
      setOrderId("")
      setOrderNewTotal("")
      setOrderNewStatus("")
      setOrderNewPayment("")
      setOrderReason("")
      const o = await getTenantOrders(ticket.tenant_id)
      setOrders(o)
      onCorrectionApplied()
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erreur lors de la correction")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={handleOpen}
        className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm text-foreground">Outils de correction</span>
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
            Admin
          </Badge>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 bg-background">
          {/* Feedback messages */}
          {successMsg && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-success/10 text-success text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {loadingData ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground ml-2">Chargement des donnees du tenant...</span>
            </div>
          ) : (
            <Tabs defaultValue="stock" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stock" className="text-xs gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="price" className="text-xs gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Prix
                </TabsTrigger>
                <TabsTrigger value="order" className="text-xs gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Commande
                </TabsTrigger>
              </TabsList>

              {/* ── Stock Tab ── */}
              <TabsContent value="stock" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Produit</Label>
                  <Select value={stockItemId} onValueChange={setStockItemId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choisir un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {TYPE_LABELS[p.type]?.substring(0, 2).toUpperCase() || p.type}
                            </Badge>
                            {p.name}
                            <span className="text-muted-foreground">({p.currentStock} {p.unit})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStockProduct && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                    Stock actuel : <strong className="text-foreground">{selectedStockProduct.currentStock} {selectedStockProduct.unit}</strong>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nouvelle quantite</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockNewQty}
                    onChange={(e) => setStockNewQty(e.target.value)}
                    placeholder="Ex: 150"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Raison de la correction</Label>
                  <Input
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    placeholder="Ex: Erreur de saisie lors de la reception"
                    className="h-9 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleStockCorrection}
                  disabled={applying || !stockItemId || !stockNewQty.trim() || !stockReason.trim()}
                  className="w-full text-xs"
                >
                  {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Settings2 className="h-3.5 w-3.5 mr-1.5" />}
                  Appliquer la correction stock
                </Button>
              </TabsContent>

              {/* ── Price Tab ── */}
              <TabsContent value="price" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Produit</Label>
                  <Select value={priceItemId} onValueChange={setPriceItemId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choisir un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {TYPE_LABELS[p.type]?.substring(0, 2).toUpperCase() || p.type}
                            </Badge>
                            {p.name}
                            <span className="text-muted-foreground">({p.price} DA)</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedPriceProduct && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                      Prix actuel : <strong className="text-foreground">{selectedPriceProduct.price} DA</strong>
                      {selectedPriceProduct.costPrice !== undefined && (
                        <> | Cout : <strong className="text-foreground">{selectedPriceProduct.costPrice} DA</strong></>
                      )}
                    </div>
                    {selectedPriceProduct.type === "finished_product" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Type de prix</Label>
                        <Select value={priceField} onValueChange={(v) => setPriceField(v as "selling" | "cost")}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="selling" className="text-xs">Prix de vente</SelectItem>
                            <SelectItem value="cost" className="text-xs">Prix de revient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nouveau prix (DA)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceNewValue}
                    onChange={(e) => setPriceNewValue(e.target.value)}
                    placeholder="Ex: 250"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Raison de la correction</Label>
                  <Input
                    value={priceReason}
                    onChange={(e) => setPriceReason(e.target.value)}
                    placeholder="Ex: Mauvais prix fournisseur saisi"
                    className="h-9 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handlePriceCorrection}
                  disabled={applying || !priceItemId || !priceNewValue.trim() || !priceReason.trim()}
                  className="w-full text-xs"
                >
                  {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Settings2 className="h-3.5 w-3.5 mr-1.5" />}
                  Appliquer la correction prix
                </Button>
              </TabsContent>

              {/* ── Order Tab ── */}
              <TabsContent value="order" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Commande</Label>
                  <Select value={orderId} onValueChange={setOrderId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choisir une commande..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.customerName} - {o.total} DA ({new Date(o.createdAt).toLocaleDateString("fr-FR")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedOrder && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
                    <div>Client : <strong className="text-foreground">{selectedOrder.customerName}</strong></div>
                    <div>Total : <strong className="text-foreground">{selectedOrder.total} DA</strong> | Statut : <strong className="text-foreground">{ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</strong> | Paiement : <strong className="text-foreground">{PAYMENT_STATUS_LABELS[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}</strong></div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nouveau total (DA) - optionnel</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderNewTotal}
                    onChange={(e) => setOrderNewTotal(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Statut</Label>
                    <Select value={orderNewStatus} onValueChange={setOrderNewStatus}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Ne pas changer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nouveau" className="text-xs">Nouveau</SelectItem>
                        <SelectItem value="en-preparation" className="text-xs">En preparation</SelectItem>
                        <SelectItem value="pret" className="text-xs">Pret</SelectItem>
                        <SelectItem value="en-livraison" className="text-xs">En livraison</SelectItem>
                        <SelectItem value="livre" className="text-xs">Livre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Paiement</Label>
                    <Select value={orderNewPayment} onValueChange={setOrderNewPayment}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Ne pas changer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid" className="text-xs">Paye</SelectItem>
                        <SelectItem value="unpaid" className="text-xs">Non paye</SelectItem>
                        <SelectItem value="partial" className="text-xs">Partiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Raison de la correction</Label>
                  <Input
                    value={orderReason}
                    onChange={(e) => setOrderReason(e.target.value)}
                    placeholder="Ex: Erreur de montant signale par le client"
                    className="h-9 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleOrderCorrection}
                  disabled={applying || !orderId || !orderReason.trim()}
                  className="w-full text-xs"
                >
                  {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Settings2 className="h-3.5 w-3.5 mr-1.5" />}
                  Appliquer la correction commande
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Ticket conversation view (admin) ──────────────────────
function AdminTicketConversation({
  ticket,
  onBack,
  onStatusChange,
}: {
  ticket: AdminTicketOverview
  onBack: () => void
  onStatusChange: () => void
}) {
  const [messages, setMessages] = useState<AdminTicketMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const msgs = await getTicketMessages(ticket.id)
    setMessages(msgs)
    setLoading(false)
  }, [ticket.id])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend() {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await replyToTicket(ticket.id, newMessage.trim())
      setNewMessage("")
      await loadMessages()
      onStatusChange()
    } catch (err) {
      console.error("Failed to reply:", err)
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(ticket.id, status)
      onStatusChange()
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  function renderMessage(msg: AdminTicketMessage) {
    const isAdmin = msg.sender_type === "admin"
    const isSystem = msg.sender_type === "system"

    if (isSystem) {
      // Parse system message for structured display
      const parts = msg.message.split(" | ")
      const action = parts[0] || ""
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <div className="max-w-[90%] rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{action}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(msg.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="space-y-0.5">
              {parts.slice(1).map((part, i) => (
                <p key={i} className="text-xs text-foreground/80">{part.trim()}</p>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
          isAdmin
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}>
          <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "justify-end" : ""}`}>
            <span className={`text-xs font-medium ${isAdmin ? "text-primary-foreground/80" : "text-foreground/70"}`}>
              {msg.sender_name}
            </span>
            <span className={`text-[10px] ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {new Date(msg.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <Badge variant="outline" className="text-xs gap-1">
              <Building2 className="h-3 w-3" />
              {ticket.tenant_name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              par {ticket.created_by_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <Select
            value={ticket.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Ouvert</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="resolved">Resolu</SelectItem>
              <SelectItem value="closed">Ferme</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Correction panel */}
      <div className="py-3">
        <CorrectionPanel ticket={ticket} onCorrectionApplied={loadMessages} />
      </div>

      <Separator />

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 py-4" style={{ maxHeight: "calc(100vh - 520px)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun message</p>
        ) : (
          <div className="space-y-4 px-1">
            {messages.map(renderMessage)}
          </div>
        )}
      </ScrollArea>

      {/* Reply input */}
      <Separator />
      <div className="flex items-end gap-2 pt-4">
        <Textarea
          placeholder="Repondre au ticket..."
          rows={2}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

// ─── Main admin tickets list ───────────────────────────────
export function TicketsList() {
  const [tickets, setTickets] = useState<AdminTicketOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketOverview | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const loadTickets = useCallback(async () => {
    setLoading(true)
    const data = await getAllTickets()
    setTickets(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (selectedTicket) {
    return (
      <Card>
        <CardContent className="p-6">
          <AdminTicketConversation
            ticket={selectedTicket}
            onBack={() => {
              setSelectedTicket(null)
              loadTickets()
            }}
            onStatusChange={loadTickets}
          />
        </CardContent>
      </Card>
    )
  }

  const filteredTickets = tickets
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)

  const openCount = tickets.filter((t) => t.status === "open").length
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
              <AlertCircle className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Ouverts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{urgentCount}</p>
              <p className="text-xs text-muted-foreground">Urgents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Tous les tickets</CardTitle>
              <CardDescription>{filteredTickets.length} ticket(s)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="open">Ouverts</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="resolved">Resolus</SelectItem>
                  <SelectItem value="closed">Fermes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Priorite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorites</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm text-muted-foreground">Aucun ticket</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Patisserie</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Priorite</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Messages</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {ticket.tenant_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ticket.created_by_name}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {ticket.message_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
