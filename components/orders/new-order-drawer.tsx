"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
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

  // Fetch products from Supabase
  useEffect(() => {
    if (!open || tenantLoading || currentTenant.id === "demo") return

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
  }, [open, currentTenant.id])

  const handleAddItem = () => {
    if (!selectedProduct) return

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const existingItem = items.find(i => i.productId === selectedProduct)
    if (existingItem) {
      setItems(items.map(i =>
        i.productId === selectedProduct
          ? { ...i, quantity: i.quantity + 1 }
          : i
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvelle commande</SheetTitle>
          <SheetDescription>
            Creer une nouvelle commande client
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Informations client</h4>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nom du client *</Label>
                <Input
                  id="customerName"
                  placeholder="Ex: Mohamed Ben Ali"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telephone</Label>
                <Input
                  id="customerPhone"
                  placeholder="Ex: 98 123 456"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
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

          {/* Delivery Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Livraison</h4>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Mode de livraison</Label>
                <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as typeof deliveryType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Retrait en boutique</SelectItem>
                    <SelectItem value="delivery">Livraison a domicile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Date de livraison souhaitee</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              {deliveryType === "delivery" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Adresse de livraison *</Label>
                    <Input
                      id="customerAddress"
                      placeholder="Ex: 25 Rue de la Liberte, Tunis 1001"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Transporteur / Coursier</Label>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un transporteur" />
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
                    <Label htmlFor="shippingCost">Frais de livraison (TND)</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      placeholder="0"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Add Items */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Articles</h4>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement des produits...
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun produit disponible. Ajoutez des produits finis dans Stocks.
              </p>
            ) : (
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
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
                <Button onClick={handleAddItem} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
              <div className="rounded-lg border divide-y">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.price.toLocaleString("fr-TN")} TND / unite
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-transparent"
                        onClick={() => handleUpdateQuantity(item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-transparent"
                        onClick={() => handleUpdateQuantity(item.productId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Instructions speciales, allergies, details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Payment */}
          {items.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Paiement</h4>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{subtotal.toLocaleString("fr-TN")} TND</span>
                </div>

                {deliveryType === "delivery" && shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Frais de livraison</span>
                    <span>{shipping.toLocaleString("fr-TN")} TND</span>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{total.toLocaleString("fr-TN")} TND</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit">Acompte (optionnel)</Label>
                  <Input
                    id="deposit"
                    type="number"
                    placeholder="0"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                  />
                </div>

                {deposit && Number(deposit) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Reste a payer</span>
                    <span>{(total - Number(deposit)).toLocaleString("fr-TN")} TND</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Creer la commande
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
