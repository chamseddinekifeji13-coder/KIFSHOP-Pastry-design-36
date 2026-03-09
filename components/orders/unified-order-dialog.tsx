"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Phone,
  Loader2,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Crown,
  ShieldAlert,
  Ban,
  User,
  Hash,
  TrendingUp,
  Search,
  StickyNote,
  Truck,
  MapPin,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  ChevronsUpDown,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTenant } from "@/lib/tenant-context"
import { useClientStatus } from "@/hooks/use-client-status"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  selling_price: number
  current_stock: number
}

interface OrderItemLocal {
  productId: string
  name: string
  quantity: number
  price: number
}

interface UnifiedOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreated?: () => void
}

const couriers = [
  { id: "aramex", name: "Aramex", defaultCost: 8 },
  { id: "rapidpost", name: "Rapid Poste", defaultCost: 7 },
  { id: "express", name: "Tunisia Express", defaultCost: 10 },
  { id: "stafim", name: "Stafim", defaultCost: 9 },
  { id: "autre", name: "Autre coursier", defaultCost: 0 },
]

const gouvernorats = [
  "Ariana", "Beja", "Ben Arous", "Bizerte", "Gabes", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "Kebili", "Le Kef", "Mahdia",
  "La Manouba", "Medenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
]

export function UnifiedOrderDialog({ open, onOpenChange, onOrderCreated }: UnifiedOrderDialogProps) {
  const { currentTenant, currentUser, isLoading: tenantLoading } = useTenant()
  const {
    client,
    isLoading: clientLoading,
    error: clientError,
    isNewClient,
    isBlocked,
    hasExcessiveReturns,
    statusLabel,
    lookupClient,
    resetReturns,
    clearClient,
  } = useClientStatus()

  // Phone lookup
  const [phone, setPhone] = useState("")
  const [truecallerVerified, setTruecallerVerified] = useState(false)

  // Client info (for new clients)
  const [clientName, setClientName] = useState("")
  const [clientNameEditMode, setClientNameEditMode] = useState(false)
  const [clientNameEdit, setClientNameEdit] = useState("")
  const [clientAddress, setClientAddress] = useState("")

  // Order fields
  const [source, setSource] = useState<string>("phone")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [courier, setCourier] = useState("")
  const [gouvernorat, setGouvernorat] = useState("")
  const [shippingCost, setShippingCost] = useState("0")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [items, setItems] = useState<OrderItemLocal[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  const phoneRef = useRef<HTMLInputElement>(null)

  // Auto-focus phone input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => phoneRef.current?.focus(), 100)
    }
  }, [open])

  // Load products
  useEffect(() => {
    if (!open || tenantLoading || currentTenant.id === "__fallback__") return
    async function loadProducts() {
      setLoadingProducts(true)
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from("finished_products")
        .select("id, name, selling_price, current_stock")
        .eq("tenant_id", currentTenant.id)
        .order("name")
      if (!error && data) {
        setProducts(data.map((p) => ({
          ...p,
          selling_price: Number(p.selling_price),
          current_stock: Number(p.current_stock),
        })))
      }
      setLoadingProducts(false)
    }
    loadProducts()
  }, [open, currentTenant.id, tenantLoading])

  // Phone lookup handler
  const handlePhoneLookup = useCallback(async () => {
    const cleanPhone = phone.replace(/\s/g, "").trim()
    if (!isValidPhone) return
    if (currentTenant.id === "__fallback__") return
    
    try {
      const result = await lookupClient(cleanPhone, currentTenant.id)
      if (result && result.name) {
        setClientName(result.name)
        setClientNameEdit(result.name)
      }
    } catch (err) {
      console.error("[v0] Error lookup client:", err)
      toast.error("Erreur lors de la recherche du client")
    }
  }, [phone, currentTenant.id, lookupClient, isValidPhone])

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handlePhoneLookup()
    }
  }

  // Edit client name
  const handleEditClientName = async () => {
    if (!client?.id || !clientNameEdit.trim()) return
    
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from("clients")
        .update({ 
          name: clientNameEdit.trim(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", client.id)
      
      if (error) {
        console.error("[v0] Error updating client name:", error)
        toast.error("Erreur mise à jour client")
        return
      }

      // Update local state and re-lookup to sync hook
      setClientName(clientNameEdit.trim())
      setClientNameEditMode(false)
      setClientNameEdit("")
      
      // Re-lookup to update useClientStatus hook
      await lookupClient(client.phone, currentTenant.id)
      
      toast.success("Nom du client mis à jour")
    } catch (err) {
      console.error("[v0] Exception updating client:", err)
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const handleCancelEditClientName = () => {
    setClientNameEditMode(false)
    setClientNameEdit("")
  }

  // Add item to order
  const handleAddItem = useCallback((productId?: string) => {
    const pid = productId || selectedProduct
    if (!pid) return
    const product = products.find(p => p.id === pid)
    if (!product) return
    const existing = items.find(i => i.productId === pid)
    if (existing) {
      setItems(items.map(i =>
        i.productId === pid ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setItems([...items, { productId: product.id, name: product.name, quantity: 1, price: product.selling_price }])
    }
    setSelectedProduct("")
    setProductSearchOpen(false)
  }, [selectedProduct, products, items])

  // Remove item
  const handleRemoveItem = useCallback((productId: string) => {
    setItems(items.filter(i => i.productId !== productId))
  }, [items])
    setSelectedProduct("")
    setProductSearchOpen(false)
  }

  // Update quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems(prev =>
      prev
        .map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId))
  }

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
    [items]
  )
  const shipping = useMemo(
    () => deliveryType === "delivery" ? (Number(shippingCost) || 0) : 0,
    [deliveryType, shippingCost]
  )
  const total = subtotal + shipping

  // Validation téléphone Tunisien (8 chiffres)
  const isValidPhone = useMemo(
    () => /^\d{8}$/.test(phone.replace(/\s/g, "")),
    [phone]
  )

  // Submit order
  const handleSubmit = useCallback(async () => {
    if (!client || isBlocked || hasExcessiveReturns || submitting) return
    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un article")
      return
    }
    if (isNewClient && !clientName.trim()) {
      toast.error("Veuillez entrer le nom du client")
      return
    }
    if (deliveryType === "delivery" && !clientAddress.trim()) {
      toast.error("Veuillez entrer l'adresse de livraison")
      return
    }

    setSubmitting(true)
    try {
      // Update client name if new - IMPORTANT: Must happen before order creation
      if (isNewClient && clientName.trim() && client?.id) {
        const supabase = createSupabaseClient()
        const { error: updateError } = await supabase
          .from("clients")
          .update({ 
            name: clientName.trim(),
            updated_at: new Date().toISOString() 
          })
          .eq("id", client.id)
        
        if (updateError) {
          console.error("[v0] Error updating client name:", updateError)
          toast.error("Erreur mise à jour client")
          setSubmitting(false)
          return
        }
      }

      const itemsDesc = items.map(i => `${i.quantity}x ${i.name}`).join(", ")

      const res = await fetch("/api/quick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          phone: client.phone,
          clientName: clientName.trim() || client.name,
          amount: total,
          itemsDescription: itemsDesc,
          notes: notes.trim() || undefined,
          source,
          deliveryType,
          courier: deliveryType === "delivery" ? courier : undefined,
          gouvernorat: deliveryType === "delivery" ? gouvernorat : undefined,
          shippingCost: shipping,
          deliveryDate: deliveryDate || undefined,
          address: deliveryType === "delivery" ? clientAddress.trim() : undefined,
          truecallerVerified,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur creation commande")
      }

      setSuccess(true)
      toast.success("Commande enregistree !")
      onOrderCreated?.()
      setTimeout(() => handleClose(), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur creation commande")
    } finally {
      setSubmitting(false)
    }
  }, [client, isBlocked, hasExcessiveReturns, submitting, items, clientName, isNewClient, deliveryType, clientAddress, total, notes, source, courier, gouvernorat, shipping, deliveryDate, truecallerVerified, onOrderCreated, handleClose])

  // Close handler
  const handleClose = () => {
    setPhone("")
    setTruecallerVerified(false)
    setClientName("")
    setClientNameEditMode(false)
    setClientNameEdit("")
    setClientAddress("")
    setSource("phone")
    setDeliveryType("pickup")
    setCourier("")
    setGouvernorat("")
    setShippingCost("")
    setDeliveryDate("")
    setItems([])
    setSelectedProduct("")
    setProductSearchOpen(false)
    setNotes("")
    setSuccess(false)
    clearClient()
    onOpenChange(false)
  }

  // Reset returns
  const handleResetReturns = async () => {
    if (!client) return
    await resetReturns(client.id)
    setShowResetConfirm(false)
    toast.success("Compteur de retours remis a zero")
  }

  const canSubmit = client && !isBlocked && !hasExcessiveReturns && !submitting && items.length > 0 && (!isNewClient || clientName.trim())
  const clientOk = client && !isBlocked && !hasExcessiveReturns

  // Status badge
  const getStatusBadge = () => {
    if (!client) return null
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      vip: { bg: "bg-emerald-100", text: "text-emerald-700", icon: <Crown className="h-3 w-3" /> },
      warning: { bg: "bg-amber-100", text: "text-amber-700", icon: <ShieldAlert className="h-3 w-3" /> },
      blacklisted: { bg: "bg-red-100", text: "text-red-700", icon: <Ban className="h-3 w-3" /> },
      normal: { bg: "bg-muted", text: "text-muted-foreground", icon: <User className="h-3 w-3" /> },
    }
    const c = configs[client.status] ?? configs.normal
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
        {c.icon}
        {statusLabel}
      </span>
    )
  }

  const getCardBorder = () => {
    switch (client?.status) {
      case "vip": return "border-emerald-300 bg-emerald-50/50"
      case "warning": return "border-amber-300 bg-amber-50/50"
      case "blacklisted": return "border-red-300 bg-red-50/50"
      default: return "border bg-card"
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-6 text-primary-foreground shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Nouvelle Commande</h2>
                <p className="text-sm text-primary-foreground/70">
                  {client ? "Commande rapide par telephone" : "Rechercher ou creer un client"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-primary-foreground/50">
                {client ? "Client identifie" : "Etape 1: Recherche client"}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 text-primary-foreground text-[11px] font-medium px-2.5 py-1 rounded-full">
                <User className="h-3 w-3" />
                {currentUser.name}
              </span>
            </div>
          </div>

          {/* Success State */}
          {success ? (
            <div className="flex flex-col items-center justify-center py-14 px-8">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-foreground mt-4">Commande confirmee !</p>
              <p className="text-sm text-muted-foreground mt-2">{clientName || client?.name || client?.phone}</p>
              <p className="text-2xl font-bold text-primary mt-1 tabular-nums">{total.toFixed(3)} TND</p>
              <p className="text-xs text-muted-foreground mt-3">
                Confirmee par <span className="font-semibold text-foreground">{currentUser.name}</span>
              </p>
            </div>
          ) : (
            <>
              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* ── SECTION: CLIENT ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    Recherche Client
                  </div>
                  <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                    {/* Phone search row */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          ref={phoneRef}
                          type="tel"
                          placeholder="Numero de telephone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onKeyDown={handlePhoneKeyDown}
                          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 tabular-nums"
                          disabled={clientLoading}
                        />
                      </div>
                      <Button
                        onClick={handlePhoneLookup}
                        disabled={clientLoading || !isValidPhone}
                        className="shrink-0"
                      >
                        {clientLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Chercher"}
                      </Button>
                    </div>

                    {/* Truecaller checkbox */}
                    {client && (
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="truecaller"
                          checked={truecallerVerified}
                          onCheckedChange={(v) => setTruecallerVerified(v === true)}
                        />
                        <label htmlFor="truecaller" className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                          Verifie sur Truecaller
                        </label>
                      </div>
                    )}

                    {clientError && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {clientError}
                      </p>
                    )}
                  </div>

                  {/* Client card */}
                  {client && (
                    <div className={`rounded-xl border-2 p-4 space-y-3 transition-all ${getCardBorder()}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${
                            client.status === "vip" ? "bg-emerald-100" :
                            client.status === "warning" ? "bg-amber-100" :
                            client.status === "blacklisted" ? "bg-red-100" : "bg-muted"
                          }`}>
                            {client.status === "vip" ? <Crown className="h-4 w-4 text-emerald-600" /> :
                             client.status === "warning" ? <ShieldAlert className="h-4 w-4 text-amber-600" /> :
                             client.status === "blacklisted" ? <Ban className="h-4 w-4 text-red-600" /> :
                             <User className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            {clientNameEditMode ? (
                              <div className="flex gap-2 items-center">
                                <Input
                                  autoFocus
                                  value={clientNameEdit}
                                  onChange={(e) => setClientNameEdit(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditClientName()
                                    if (e.key === "Escape") handleCancelEditClientName()
                                  }}
                                  placeholder="Nom du client"
                                  className="h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleEditClientName}
                                  className="h-8 px-2"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEditClientName}
                                  className="h-8 px-2"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {clientName || client.name || "Client sans nom"}
                                  {isNewClient && (
                                    <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Nouveau</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{client.phone}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!clientNameEditMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setClientNameEdit(clientName || client.name || "")
                                setClientNameEditMode(true)
                              }}
                              className="h-8 px-2"
                              title="Éditer le nom du client"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {getStatusBadge()}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-background rounded-lg px-3 py-2 text-center border border-border/50">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                            <Hash className="h-3 w-3" />
                            <span className="text-[10px] font-medium uppercase">Cmd</span>
                          </div>
                          <p className="text-sm font-bold text-foreground tabular-nums">
                            {(client.total_orders || 0) + (client.delivery_count || 0)}
                          </p>
                        </div>
                        <div className="bg-background rounded-lg px-3 py-2 text-center border border-border/50">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-[10px] font-medium uppercase">Total</span>
                          </div>
                          <p className="text-sm font-bold text-foreground tabular-nums">
                            {((client.total_spent || 0) + (client.delivery_total || 0)).toFixed(0)}
                          </p>
                        </div>
                        <div className="bg-background rounded-lg px-3 py-2 text-center border border-border/50">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                            <RotateCcw className="h-3 w-3" />
                            <span className="text-[10px] font-medium uppercase">Retours</span>
                          </div>
                          <p className={`text-sm font-bold tabular-nums ${(client.return_count + (client.delivery_returned || 0)) >= 2 ? "text-red-600" : "text-foreground"}`}>
                            {(client.return_count || 0) + (client.delivery_returned || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Blocked alert */}
                      {isBlocked && (
                        <div className="flex items-center gap-3 bg-red-100 border border-red-200 rounded-lg px-3.5 py-3">
                          <Ban className="h-5 w-5 text-red-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-red-700">Client blackliste</p>
                            <p className="text-[11px] text-red-600 mt-0.5">Commande impossible.</p>
                          </div>
                        </div>
                      )}

                      {/* Excessive returns */}
                      {hasExcessiveReturns && !isBlocked && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 bg-amber-100 border border-amber-200 rounded-lg px-3.5 py-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-amber-700">{client.return_count} retours enregistres</p>
                              <p className="text-[11px] text-amber-600 mt-0.5">Commande bloquee automatiquement.</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setShowResetConfirm(true)}>
                            <RotateCcw className="h-3 w-3 mr-1.5" />
                            Remettre a zero les retours
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New client extra fields */}
                  {isNewClient && client && (
                    <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Nom du client *</Label>
                        <Input
                          placeholder="Ex: Mohamed Ben Ali"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SECTION: ARTICLES ── */}
                {client && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Articles
                    </div>

                    {/* Product selector */}
                    <div className="space-y-2">
                      <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between bg-card"
                            disabled={loadingProducts}
                          >
                            {selectedProduct ? products.find(p => p.id === selectedProduct)?.name : "Ajouter un article..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Chercher un produit..." />
                            <CommandEmpty>Aucun produit trouvé</CommandEmpty>
                            <CommandGroup>
                              <CommandList>
                                {products.map(product => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    onSelect={() => {
                                      setSelectedProduct(product.id)
                                      setProductSearchOpen(false)
                                      handleAddItem(product.id)
                                    }}
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{product.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {product.selling_price.toFixed(3)} TND • Stock: {product.current_stock}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Items list */}
                    {items.length > 0 ? (
                      <div className="rounded-xl border bg-card p-4 space-y-2">
                        {items.map(item => (
                          <div key={item.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {item.quantity} x {item.price.toFixed(3)} TND
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.productId, -1)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.productId, 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t mt-3 flex justify-between font-bold">
                          <span>Sous-total:</span>
                          <span className="tabular-nums">{subtotal.toFixed(3)} TND</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-center">
                        <p className="text-xs text-muted-foreground">Aucun article ajoute</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SECTION: LIVRAISON ── */}
                {client && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      Livraison
                    </div>

                    <div className="rounded-xl border bg-card p-4 space-y-4">
                      {/* Delivery type */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Mode de livraison</Label>
                        <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as "pickup" | "delivery")}>
                          <SelectTrigger className="bg-muted/50 border-0 focus:ring-1 focus:ring-primary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">Retrait au comptoir</SelectItem>
                            <SelectItem value="delivery">Livraison</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {deliveryType === "delivery" && (
                        <>
                          {/* Address */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Adresse de livraison *</Label>
                            <Input
                              placeholder="Ex: 123 Rue du Lac, Tunis"
                              value={clientAddress}
                              onChange={(e) => setClientAddress(e.target.value)}
                              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                            />
                          </div>

                          {/* Gouvernorat */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Gouvernorat</Label>
                            <Select value={gouvernorat} onValueChange={setGouvernorat}>
                              <SelectTrigger className="bg-muted/50 border-0 focus:ring-1 focus:ring-primary/30">
                                <SelectValue placeholder="Selectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {gouvernorats.map(g => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Courier */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Coursier</Label>
                            <Select value={courier} onValueChange={(c) => {
                              setCourier(c)
                              const courierObj = couriers.find(co => co.id === c)
                              if (courierObj) setShippingCost(courierObj.defaultCost.toString())
                            }}>
                              <SelectTrigger className="bg-muted/50 border-0 focus:ring-1 focus:ring-primary/30">
                                <SelectValue placeholder="Selectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {couriers.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Shipping cost */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Frais de livraison</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="0.000"
                              value={shippingCost}
                              onChange={(e) => setShippingCost(e.target.value)}
                              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 tabular-nums"
                            />
                          </div>
                        </>
                      )}

                      {/* Delivery date */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Date de livraison</Label>
                        <Input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SECTION: DETAILS ── */}
                {client && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <StickyNote className="h-3.5 w-3.5" />
                      Autres Details
                    </div>

                    <div className="rounded-xl border bg-card p-4 space-y-4">
                      {/* Source */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Source</Label>
                        <Select value={source} onValueChange={setSource}>
                          <SelectTrigger className="bg-muted/50 border-0 focus:ring-1 focus:ring-primary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phone">Telephone</SelectItem>
                            <SelectItem value="comptoir">Comptoir</SelectItem>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Notes</Label>
                        <Textarea
                          placeholder="Ajouter des notes specifiques..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 resize-none h-20"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Summary and Submit */}
              {client && (
                <div className="border-t bg-muted/40 px-6 py-4 shrink-0 space-y-3">
                  {/* Total */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Total:</span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{total.toFixed(3)} TND</span>
                  </div>

                  {/* Submit button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                    {submitting ? "Enregistrement..." : "Enregistrer Commande"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset returns confirmation dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre a zero les retours ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action permettra au client de commander a nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetReturns} className="bg-primary">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
