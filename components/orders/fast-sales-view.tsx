"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Phone, Search, User, Plus, Minus, Trash2,
  ShoppingBag, Truck, Store, Check, Loader2,
  Clock, AlertTriangle, Ban, Crown,
  Zap, X
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTenant } from "@/lib/tenant-context"
import { useClientStatus } from "@/hooks/use-client-status"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { fetchActiveDeliveryCompanies } from "@/lib/delivery-companies/actions"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  selling_price: number
  current_stock: number
}

interface OrderItem {
  productId: string
  name: string
  quantity: number
  price: number
}

const gouvernorats = [
  "Ariana", "Beja", "Ben Arous", "Bizerte", "Gabes", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "Kebili", "Le Kef", "Mahdia",
  "La Manouba", "Medenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
]

export function FastSalesView() {
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
    clearClient,
  } = useClientStatus()

  // State
  const [phone, setPhone] = useState("")
  const [clientName, setClientName] = useState("")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [courier, setCourier] = useState("")
  const [gouvernorat, setGouvernorat] = useState("")
  const [address, setAddress] = useState("")
  const [shippingCost, setShippingCost] = useState("")
  const [items, setItems] = useState<OrderItem[]>([])
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)

  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([])
  const [productFilter, setProductFilter] = useState("")

  const phoneRef = useRef<HTMLInputElement>(null)

  // Load products on mount
  useEffect(() => {
    if (tenantLoading || currentTenant.id === "__fallback__") return

    async function loadData() {
      setLoadingProducts(true)
      try {
        const supabase = createSupabaseClient()
        const { data } = await supabase
          .from("finished_products")
          .select("id, name, selling_price, current_stock")
          .eq("tenant_id", currentTenant.id)
          .order("name")

        if (data) {
          setProducts(data.map(p => ({
            ...p,
            selling_price: Number(p.selling_price),
            current_stock: Number(p.current_stock),
          })))
        }

        // Load couriers
        const companies = await fetchActiveDeliveryCompanies(currentTenant.id)
        setCouriers(companies)
      } catch (err) {
        console.error("Error loading data:", err)
      } finally {
        setLoadingProducts(false)
      }
    }

    loadData()
  }, [currentTenant.id, tenantLoading])

  // Auto-focus phone on mount
  useEffect(() => {
    phoneRef.current?.focus()
  }, [])

  // Filtered products for quick selection
  const filteredProducts = useMemo(() => {
    if (!productFilter) return products.slice(0, 12)
    const lower = productFilter.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(lower)).slice(0, 12)
  }, [products, productFilter])

  // Totals
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [items]
  )
  const shipping = deliveryType === "delivery" ? (Number(shippingCost) || 0) : 0
  const total = subtotal + shipping

  // Phone lookup
  const handlePhoneLookup = useCallback(async () => {
    const cleanPhone = phone.replace(/\s/g, "").trim()
    if (cleanPhone.length < 4) return
    if (currentTenant.id === "__fallback__") return

    try {
      const result = await lookupClient(cleanPhone, currentTenant.id)
      if (result?.name) {
        setClientName(result.name)
      }
    } catch {
      toast.error("Erreur lors de la recherche du client")
    }
  }, [phone, currentTenant.id, lookupClient])

  // Add product to cart
  const handleAddProduct = (product: Product) => {
    const existing = items.find(i => i.productId === product.id)
    if (existing) {
      setItems(items.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.selling_price
      }])
    }
    setProductFilter("")
  }

  // Update quantity
  const handleQuantity = (productId: string, delta: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta)
          return { ...item, quantity: newQty }
        }
        return item
      })
    )
  }

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId))
  }

  // Submit order
  const handleSubmit = async () => {
    if (!client || isBlocked || hasExcessiveReturns || submitting) return
    if (items.length === 0) {
      toast.error("Ajoutez au moins un article")
      return
    }
    if (isNewClient && !clientName.trim()) {
      toast.error("Entrez le nom du client")
      return
    }
    if (deliveryType === "delivery" && !address.trim()) {
      toast.error("Entrez l'adresse de livraison")
      return
    }

    setSubmitting(true)
    try {
      // Update client name if new
      if (isNewClient && clientName.trim()) {
        const supabase = createSupabaseClient()
        await supabase
          .from("clients")
          .update({ name: clientName.trim() })
          .eq("id", client.id)
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
          source: "phone",
          deliveryType,
          courier: deliveryType === "delivery" ? courier : undefined,
          gouvernorat: deliveryType === "delivery" ? gouvernorat : undefined,
          shippingCost: shipping,
          address: deliveryType === "delivery" ? address.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur creation commande")
      }

      const result = await res.json()
      setLastOrderId(result.orderId)
      toast.success("Commande enregistree !")
      
      // Reset for next order
      handleReset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur creation commande")
    } finally {
      setSubmitting(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setPhone("")
    setClientName("")
    setDeliveryType("pickup")
    setCourier("")
    setGouvernorat("")
    setAddress("")
    setShippingCost("")
    setItems([])
    setNotes("")
    clearClient()
    phoneRef.current?.focus()
  }

  const clientOk = client && !isBlocked && !hasExcessiveReturns
  const canSubmit = clientOk && items.length > 0 && !submitting

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6" />
          <div>
            <h1 className="font-bold text-lg">Vente Rapide</h1>
            <p className="text-xs text-primary-foreground/70">Vendeur: {currentUser.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-mono">
            {new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 p-4">
        {/* Left: Client & Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Client</span>
              </div>
              
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={phoneRef}
                    type="tel"
                    placeholder="Numero de telephone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                    className="pl-10 h-12 text-lg touch-target"
                  />
                </div>
                <Button 
                  onClick={handlePhoneLookup}
                  disabled={clientLoading || phone.length < 4}
                  className="h-12 px-6 touch-target"
                >
                  {clientLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "OK"}
                </Button>
              </div>

              {/* Client Info */}
              {client && (
                <div className={`rounded-xl p-4 border-2 ${
                  client.status === "vip" ? "border-emerald-300 bg-emerald-50" :
                  client.status === "blacklisted" ? "border-red-300 bg-red-50" :
                  client.status === "warning" ? "border-amber-300 bg-amber-50" :
                  "border-border bg-muted/30"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        client.status === "vip" ? "bg-emerald-100" :
                        client.status === "blacklisted" ? "bg-red-100" :
                        client.status === "warning" ? "bg-amber-100" :
                        "bg-muted"
                      }`}>
                        {client.status === "vip" ? <Crown className="h-5 w-5 text-emerald-600" /> :
                         client.status === "blacklisted" ? <Ban className="h-5 w-5 text-red-600" /> :
                         client.status === "warning" ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
                         <User className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-semibold">{client.name || "Nouveau client"}</p>
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      </div>
                    </div>
                    <Badge variant={
                      client.status === "vip" ? "default" :
                      client.status === "blacklisted" ? "destructive" :
                      client.status === "warning" ? "secondary" : "outline"
                    }>
                      {statusLabel}
                    </Badge>
                  </div>

                  {isNewClient && (
                    <Input
                      placeholder="Nom du client"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="h-12 text-lg touch-target mt-2"
                    />
                  )}

                  {isBlocked && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mt-2 flex items-center gap-2">
                      <Ban className="h-5 w-5" />
                      <span className="font-medium">Client bloque - Commande impossible</span>
                    </div>
                  )}

                  {hasExcessiveReturns && !isBlocked && (
                    <div className="bg-amber-100 text-amber-700 p-3 rounded-lg mt-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Retours excessifs - Validation requise</span>
                    </div>
                  )}

                  {/* Quick stats */}
                  {!isNewClient && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="bg-background rounded-lg p-2 text-center">
                        <p className="text-lg font-bold">{client.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">Commandes</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 text-center">
                        <p className="text-lg font-bold">{(client.totalSpent ?? 0).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">TND</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 text-center">
                        <p className={`text-lg font-bold ${client.returnCount > 0 ? "text-red-600" : ""}`}>
                          {client.returnCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Retours</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {clientError && (
                <p className="text-sm text-destructive mt-2">{clientError}</p>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          {clientOk && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Produits</span>
                </div>

                {/* Search */}
                <Input
                  placeholder="Rechercher un produit..."
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="h-12 text-lg touch-target mb-3"
                />

                {/* Product Grid */}
                <div className="pos-grid mb-4">
                  {loadingProducts ? (
                    <div className="col-span-full flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="col-span-full text-center text-muted-foreground py-4">
                      Aucun produit trouve
                    </p>
                  ) : (
                    filteredProducts.map(product => (
                      <Button
                        key={product.id}
                        variant="outline"
                        className="h-20 flex flex-col items-start justify-center p-3 pos-btn text-left"
                        onClick={() => handleAddProduct(product)}
                      >
                        <span className="font-medium text-sm line-clamp-2">{product.name}</span>
                        <span className="text-lg font-bold text-primary">{product.selling_price.toFixed(3)}</span>
                      </Button>
                    ))
                  )}
                </div>

                {/* Delivery Options */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant={deliveryType === "pickup" ? "default" : "outline"}
                      className="flex-1 h-12 touch-target"
                      onClick={() => setDeliveryType("pickup")}
                    >
                      <Store className="h-5 w-5 mr-2" />
                      Retrait
                    </Button>
                    <Button
                      variant={deliveryType === "delivery" ? "default" : "outline"}
                      className="flex-1 h-12 touch-target"
                      onClick={() => setDeliveryType("delivery")}
                    >
                      <Truck className="h-5 w-5 mr-2" />
                      Livraison
                    </Button>
                  </div>

                  {deliveryType === "delivery" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={gouvernorat} onValueChange={setGouvernorat}>
                        <SelectTrigger className="h-12 touch-target">
                          <SelectValue placeholder="Gouvernorat" />
                        </SelectTrigger>
                        <SelectContent>
                          {gouvernorats.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={courier} onValueChange={setCourier}>
                        <SelectTrigger className="h-12 touch-target">
                          <SelectValue placeholder="Livreur" />
                        </SelectTrigger>
                        <SelectContent>
                          {couriers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Adresse"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="h-12 touch-target col-span-2"
                      />
                      <Input
                        type="number"
                        placeholder="Frais livraison"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                        className="h-12 touch-target"
                      />
                    </div>
                  )}

                  <Textarea
                    placeholder="Notes (optionnel)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Cart & Total */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Panier</span>
                {items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setItems([])}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Vider
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Ajoutez des produits
                </p>
              ) : (
                <div className="space-y-3 mb-4">
                  {items.map(item => (
                    <div key={item.productId} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.price.toFixed(3)} TND x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 touch-target"
                          onClick={() => handleQuantity(item.productId, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 touch-target"
                          onClick={() => handleQuantity(item.productId, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive touch-target"
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(3)} TND</span>
                </div>
                {shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Livraison</span>
                    <span>{shipping.toFixed(3)} TND</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{total.toFixed(3)} TND</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button
                  variant="outline"
                  className="h-14 touch-target"
                  onClick={handleReset}
                >
                  <X className="h-5 w-5 mr-2" />
                  Annuler
                </Button>
                <Button
                  className="h-14 touch-target text-lg font-bold"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Valider
                    </>
                  )}
                </Button>
              </div>

              {/* Last order indicator */}
              {lastOrderId && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <Check className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-sm text-emerald-700">Derniere commande confirmee</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
