"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, Trash2, Loader2, ShoppingBag, User, Truck, CreditCard, StickyNote } from "lucide-react"
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
import { useTenant } from "@/lib/tenant-context"
import { createOrder } from "@/lib/orders/actions"
import { createClient } from "@/lib/supabase/client"
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
  const [submitting, setSubmitting] = useState(false)

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [source, setSource] = useState<string>("comptoir")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [courier, setCourier] = useState("")
  const [shippingCost, setShippingCost] = useState("")
  const [items, setItems] = useState<OrderItemLocal[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [deposit, setDeposit] = useState("")
  const [notes, setNotes] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")

  const couriers = [
    { id: "aramex", name: "Aramex", defaultCost: 8 },
    { id: "rapidpost", name: "Rapid Poste", defaultCost: 7 },
    { id: "express", name: "Tunisia Express", defaultCost: 10 },
    { id: "stafim", name: "Stafim", defaultCost: 9 },
    { id: "autre", name: "Autre coursier", defaultCost: 0 },
  ]

  useEffect(() => {
    if (!open || tenantLoading || currentTenant.id === "__fallback__") return

    async function loadProducts() {
      setLoadingProducts(true)
      const supabase = createClient()
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

  const handleAddItem = () => {
    if (!selectedProduct) return
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const existingItem = items.find(i => i.productId === selectedProduct)
    if (existingItem) {
      setItems(items.map(i =>
        i.productId === selectedProduct ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.selling_price,
      }])
    }
    setSelectedProduct("")
  }

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
  const total = subtotal + shipping

  const resetForm = () => {
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    setSource("comptoir")
    setDeliveryType("pickup")
    setCourier("")
    setShippingCost("")
    setItems([])
    setDeposit("")
    setNotes("")
    setDeliveryDate("")
  }

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("Veuillez entrer le nom du client")
      return
    }
    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un article")
      return
    }
    if (deliveryType === "delivery" && !customerAddress.trim()) {
      toast.error("Veuillez entrer l'adresse de livraison")
      return
    }
    if (deliveryType === "delivery" && !courier) {
      toast.error("Veuillez selectionner un transporteur")
      return
    }

    setSubmitting(true)

    const result = await createOrder({
      tenantId: currentTenant.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: deliveryType === "delivery" ? customerAddress.trim() : undefined,
      deliveryType,
      courier: deliveryType === "delivery" ? courier : undefined,
      shippingCost: shipping,
      source,
      deposit: Number(deposit) || 0,
      notes: notes.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    })

    setSubmitting(false)

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
                  <Label className="text-xs font-medium">Date souhaitee</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              {deliveryType === "delivery" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Adresse de livraison *</Label>
                    <Input
                      placeholder="25 Rue de la Liberte, Tunis"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Transporteur</Label>
                      <Select
                        value={courier}
                        onValueChange={(v) => {
                          setCourier(v)
                          const selected = couriers.find(c => c.id === v)
                          if (selected && selected.defaultCost > 0) {
                            setShippingCost(selected.defaultCost.toString())
                          }
                        }}
                      >
                        <SelectTrigger className="bg-muted/50 border-0">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                        <SelectContent>
                          {couriers.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.defaultCost > 0 && `(~${c.defaultCost} TND)`}
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
              {loadingProducts ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement des produits...
                </div>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Aucun produit disponible. Ajoutez des produits finis dans Stocks.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1 bg-muted/50 border-0">
                      <SelectValue placeholder="Selectionner un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {product.selling_price.toLocaleString("fr-TN")} TND
                          {product.current_stock <= 0 && " (Rupture)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddItem} disabled={!selectedProduct} size="icon" className="rounded-lg shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
    </Sheet>
  )
}
