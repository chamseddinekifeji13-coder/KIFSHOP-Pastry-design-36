"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Plus, Minus, Trash2, Loader2, ShoppingBag, User, Truck, CreditCard, StickyNote, AlertTriangle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { createOrder } from "@/lib/orders/actions"
import { createClient } from "@/lib/supabase/client"
import { fetchActiveDeliveryCompanies } from "@/lib/delivery-companies/actions"
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

interface NewOrderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function NewOrderDrawer({ open, onOpenChange, onCreated }: NewOrderDrawerProps) {
  const { currentTenant, isLoading: tenantLoading } = useTenant()
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [source, setSource] = useState<string>("comptoir")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [courier, setCourier] = useState("")
  const [gouvernorat, setGouvernorat] = useState("")
  const [shippingCost, setShippingCost] = useState("")
  const [items, setItems] = useState<OrderItemLocal[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [deposit, setDeposit] = useState("")
  const [notes, setNotes] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; existingOrder?: { id: string; createdAt: string; total: number } }>({ show: false })
  // Offer fields
  const [orderType, setOrderType] = useState<"normal" | "offre_client" | "offre_personnel">("normal")
  const [offerBeneficiary, setOfferBeneficiary] = useState("")
  const [offerReason, setOfferReason] = useState("")
  const [discountPercent, setDiscountPercent] = useState("")
  const submitLockRef = useRef(false)
  const isMountedRef = useRef(true)
  
  // Dynamic delivery companies from database
  const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)

  const gouvernorats = [
    "Ariana", "Beja", "Ben Arous", "Bizerte", "Gabes", "Gafsa",
    "Jendouba", "Kairouan", "Kasserine", "Kebili", "Le Kef", "Mahdia",
    "La Manouba", "Medenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
    "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
  ]

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!open || tenantLoading || currentTenant.id === "__fallback__") return

    async function loadProducts() {
      setLoadingProducts(true)
      setLoadingError(null)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("finished_products")
          .select("id, name, selling_price, current_stock")
          .eq("tenant_id", currentTenant.id)
          .order("name")

        if (!isMountedRef.current) return

        if (error) {
          setLoadingError("Erreur lors du chargement des produits")
          console.error("Product load error:", error)
          toast.error("Impossible de charger les produits")
          return
        }

        if (data) {
          setProducts(data.map((p) => ({
            ...p,
            selling_price: Number(p.selling_price),
            current_stock: Number(p.current_stock),
          })))
        }
      } catch (err) {
        if (!isMountedRef.current) return
        console.error("Product load exception:", err)
        setLoadingError("Erreur reseau lors du chargement")
        toast.error("Erreur reseau")
      } finally {
        if (isMountedRef.current) {
          setLoadingProducts(false)
        }
      }
    }

    loadProducts()
    
    // Load delivery companies
    async function loadCouriers() {
      setLoadingCouriers(true)
      try {
        const companies = await fetchActiveDeliveryCompanies(currentTenant.id)
        if (isMountedRef.current) {
          setCouriers(companies)
        }
      } catch (err) {
        console.error("Error loading delivery companies:", err)
      } finally {
        if (isMountedRef.current) {
          setLoadingCouriers(false)
        }
      }
    }
    loadCouriers()
  }, [open, currentTenant.id, tenantLoading])

  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const existingItem = items.find(i => i.productId === productId)
    if (existingItem) {
      setItems(items.map(i =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.selling_price,
      }])
    }
    setProductSearch("")
  }
  
  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const search = productSearch.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(search))
  }, [products, productSearch])

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const shipping = deliveryType === "delivery" ? (Number(shippingCost) || 0) : 0
  const beforeDiscount = subtotal + shipping
  const discount = discountPercent ? (beforeDiscount * (Number(discountPercent) / 100)) : 0
  const total = beforeDiscount - discount

  const resetForm = () => {
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    setSource("comptoir")
    setDeliveryType("pickup")
    setCourier("")
    setGouvernorat("")
    setShippingCost("")
    setItems([])
    setProductSearch("")
    setDeposit("")
    setNotes("")
    setDeliveryDate("")
    // Reset offer fields
    setOrderType("normal")
    setOfferBeneficiary("")
    setOfferReason("")
    setDiscountPercent("")
  }

  // Check for duplicate orders: same customer + similar total + same day
  const checkDuplicate = async (): Promise<{ id: string; createdAt: string; total: number } | null> => {
    if (!isMountedRef.current) return null
    
    const supabase = createClient()
    const today = new Date()
    // Fix: Use UTC to match server timezone
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString()

    try {
      const { data } = await supabase
        .from("orders")
        .select("id, created_at, total")
        .eq("tenant_id", currentTenant.id)
        .eq("customer_name", customerName.trim())
        .gte("created_at", startOfDay)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!isMountedRef.current) return null

      if (!data || data.length === 0) return null

      // Check if any existing order has the same total (strong indicator of duplicate)
      // Fix: Use better tolerance for 3-decimal precision
      const match = data.find(o => Math.abs(Number(o.total) - total) < 0.005)
      if (match) return { id: match.id, createdAt: match.created_at, total: Number(match.total) }

      return null
    } catch (err) {
      if (!isMountedRef.current) return null
      console.error("Duplicate check error:", err)
      return null
    }
  }

  const performCreate = async () => {
    // Hard lock to prevent any concurrent submissions
    if (submitLockRef.current || !isMountedRef.current) return
    submitLockRef.current = true
    setSubmitting(true)

    try {
      const result = await createOrder({
        tenantId: currentTenant.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryType,
        courier: deliveryType === "delivery" ? courier : undefined,
        gouvernorat: deliveryType === "delivery" ? gouvernorat : undefined,
        shippingCost: shipping,
        source,
        deposit: Number(deposit) || 0,
        notes: notes.trim() || undefined,
        deliveryDate: deliveryDate.trim(),
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        // Offer fields
        orderType: orderType !== "normal" ? orderType : undefined,
        offerBeneficiary: offerBeneficiary.trim() || undefined,
        offerReason: offerReason.trim() || undefined,
        discountPercent: discountPercent ? Number(discountPercent) : 0,
      })

      if (!isMountedRef.current) return

      if (result) {
        toast.success("Commande creee", {
          description: `Commande de ${total.toLocaleString("fr-TN")} TND pour ${customerName}`,
        })
        resetForm()
        onOpenChange(false)
        onCreated?.()
      } else {
        toast.error("Erreur lors de la creation de la commande")
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error("Order creation error:", err)
      toast.error(err instanceof Error ? err.message : "Erreur lors de la creation")
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false)
        submitLockRef.current = false
      }
    }
  }

  const handleSubmit = async () => {
    // Guard: prevent double submission
    if (submitting || submitLockRef.current) return

    if (!customerName.trim()) {
      toast.error("Veuillez entrer le nom du client")
      return
    }
    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un article")
      return
    }
    
    // Validation du total
    const orderTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    if (orderTotal <= 0) {
      toast.error("Le total de la commande doit etre superieur a 0")
      return
    }
    
    // Validation de l'adresse (TOUJOURS requise)
    if (!customerAddress.trim()) {
      toast.error("Veuillez entrer l'adresse du client")
      return
    }
    
    // Validation de la date de livraison (TOUJOURS requise)
    if (!deliveryDate.trim()) {
      toast.error("Veuillez selectionner une date de livraison")
      return
    }
    
    if (deliveryType === "delivery" && !gouvernorat) {
      toast.error("Veuillez selectionner un gouvernorat")
      return
    }
    if (deliveryType === "delivery" && !courier) {
      toast.error("Veuillez selectionner un transporteur")
      return
    }

    // Validate delivery date is not in the past
    if (deliveryDate) {
      const selectedDate = new Date(deliveryDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        toast.error("La date de livraison ne peut pas etre dans le passe")
        return
      }
    }

    setSubmitting(true)

    // Check for potential duplicate
    const duplicate = await checkDuplicate()

    if (duplicate) {
      if (!isMountedRef.current) return
      setSubmitting(false)
      setDuplicateWarning({ show: true, existingOrder: duplicate })
      return
    }

    // No duplicate found, proceed
    if (!isMountedRef.current) return
    setSubmitting(false)
    await performCreate()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouvelle commande</h2>
              <p className="text-sm text-primary-foreground/70">Creer une nouvelle commande client</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Customer Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Client
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom du client *</Label>
                <Input
                  placeholder="Ex: Mohamed Ben Ali"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Telephone</Label>
                  <Input
                    placeholder="98 123 456"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Source</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="bg-muted/50 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comptoir">Comptoir</SelectItem>
                      <SelectItem value="phone">Telephone</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="messenger">Messenger</SelectItem>
  <SelectItem value="instagram">Instagram</SelectItem>
  <SelectItem value="tiktok">TikTok</SelectItem>
  <SelectItem value="web">Site Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              Livraison
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Mode</Label>
                  <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as typeof deliveryType)}>
                    <SelectTrigger className="bg-muted/50 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Retrait en boutique</SelectItem>
                      <SelectItem value="delivery">Livraison a domicile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Date souhaitee *</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    required
                  />
                </div>
              </div>

              {/* Address - Always visible and required */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Adresse du client *</Label>
                <Input
                  placeholder="25 Rue de la Liberte, Tunis"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  required
                />
              </div>

              {deliveryType === "delivery" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Gouvernorat</Label>
                    <Select value={gouvernorat} onValueChange={setGouvernorat}>
                      <SelectTrigger className="bg-muted/50 border-0">
                        <SelectValue placeholder="Choisir le gouvernorat" />
                      </SelectTrigger>
                      <SelectContent>
                        {gouvernorats.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Transporteur</Label>
                      <Select value={courier} onValueChange={setCourier}>
                        <SelectTrigger className="bg-muted/50 border-0">
                          <SelectValue placeholder={loadingCouriers ? "Chargement..." : "Choisir"} />
                        </SelectTrigger>
                        <SelectContent>
                          {couriers.length === 0 && !loadingCouriers && (
                            <SelectItem value="__none" disabled>
                              Aucun transporteur configure
                            </SelectItem>
                          )}
                          {couriers.map(c => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Frais (TND)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                        className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Articles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              Articles
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
              {/* Product search - inline without Popover */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  disabled={loadingProducts}
                />
              </div>
              
              {loadingProducts ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement des produits...
                </div>
              ) : loadingError ? (
                <p className="text-sm text-destructive py-2 text-center flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {loadingError}
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  {productSearch ? "Aucun produit trouve" : "Aucun produit disponible"}
                </p>
              ) : (
                <ScrollArea className="h-[160px]">
                  <div className="space-y-1">
                    {filteredProducts.slice(0, 20).map(product => {
                      const inCart = items.find(i => i.productId === product.id)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddItem(product.id)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/80 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {product.selling_price.toFixed(3)} TND
                              {product.current_stock <= 0 && (
                                <span className="ml-1 text-destructive">(Rupture)</span>
                              )}
                            </div>
                          </div>
                          {inCart ? (
                            <Badge className="bg-primary/10 text-primary text-xs shrink-0 ml-2">
                              {inCart.quantity}x
                            </Badge>
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}

              {items.length > 0 && (
                <div className="rounded-lg border divide-y mt-2">
                  {items.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-3 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.price.toLocaleString("fr-TN")} TND / unite
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Offer Section */}
          <div className="space-y-4 rounded-xl border border-amber-200/50 bg-amber-50/30 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
              <CreditCard className="h-3.5 w-3.5" />
              Type de commande
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium mb-2 block">Type *</Label>
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger className="bg-white border-0 focus:ring-1 focus:ring-amber-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Commande normale</SelectItem>
                    <SelectItem value="offre_client">Offre client</SelectItem>
                    <SelectItem value="offre_personnel">Offre personnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {orderType !== "normal" && (
                <>
                  <div>
                    <Label className="text-xs font-medium">Beneficiaire *</Label>
                    <Input
                      placeholder="Nom du beneficiaire"
                      value={offerBeneficiary}
                      onChange={(e) => setOfferBeneficiary(e.target.value)}
                      className="bg-white border-0 focus-visible:ring-1 focus-visible:ring-amber-300 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Motif de l'offre *</Label>
                    <Input
                      placeholder="Ex: Fidelite, Anniversaire, Promo..."
                      value={offerReason}
                      onChange={(e) => setOfferReason(e.target.value)}
                      className="bg-white border-0 focus-visible:ring-1 focus-visible:ring-amber-300 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Reduction (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="bg-white border-0 focus-visible:ring-1 focus-visible:ring-amber-300"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </div>
            <Textarea
              placeholder="Instructions speciales, allergies, details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl"
            />
          </div>

          {/* Payment Summary */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Paiement
              </div>
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{subtotal.toLocaleString("fr-TN")} TND</span>
                </div>
                {deliveryType === "delivery" && shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Livraison</span>
                    <span>{shipping.toLocaleString("fr-TN")} TND</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="text-muted-foreground">Reduction ({discountPercent}%)</span>
                    <span>-{discount.toLocaleString("fr-TN")} TND</span>
                  </div>
                )}
                <div className="border-t border-primary/10 pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{total.toLocaleString("fr-TN")} TND</span>
                </div>
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-medium text-muted-foreground">Acompte (optionnel)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="bg-white/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
                {deposit && Number(deposit) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Reste a payer</span>
                    <span className="font-medium">{(total - Number(deposit)).toLocaleString("fr-TN")} TND</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Creer la commande
          </Button>
        </div>
      </SheetContent>

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={duplicateWarning.show} onOpenChange={(open) => !open && setDuplicateWarning({ show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <AlertDialogTitle>Commande similaire detectee</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Une commande pour <strong>{customerName.trim()}</strong> avec le meme montant
                ({duplicateWarning.existingOrder?.total.toLocaleString("fr-TN")} TND) a deja ete creee aujourd&apos;hui
                a {duplicateWarning.existingOrder?.createdAt ? new Date(duplicateWarning.existingOrder.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }) : ""}.
              </span>
              <span className="block text-sm">
                Voulez-vous quand meme creer cette commande ?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={async () => {
                setDuplicateWarning({ show: false })
                await performCreate()
              }}
            >
              Oui, creer quand meme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
