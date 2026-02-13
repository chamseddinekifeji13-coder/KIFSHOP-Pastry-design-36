"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Phone,
  X,
  Send,
  MapPin,
  User,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCatalog, type CatalogProduct } from "@/lib/mock-data"
import { toast, Toaster } from "sonner"

interface CartItem {
  product: CatalogProduct
  quantity: number
}

const tenantInfo: Record<string, { name: string; logo: string; color: string; phone: string; whatsapp: string }> = {
  masmoudi: { name: "Patisserie Masmoudi", logo: "M", color: "#4A7C59", phone: "+216 71 234 567", whatsapp: "+216 98 123 456" },
  delices: { name: "Delices du Sud", logo: "D", color: "#D4A373", phone: "+216 71 555 666", whatsapp: "+216 55 987 654" },
}

export function StorefrontView({ tenantId }: { tenantId: string }) {
  const catalog = getCatalog(tenantId).filter(p => p.isPublished)
  const info = tenantInfo[tenantId]

  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "confirm">("cart")

  // Customer info
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")
  const [notes, setNotes] = useState("")

  const cartTotal = useMemo(() =>
    cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
    [cart]
  )
  const cartCount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const addToCart = (product: CatalogProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + product.minOrder }
            : item
        )
      }
      return [...prev, { product, quantity: product.minOrder }]
    })
    toast.success("Ajoute au panier", { description: product.name })
  }

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta
        return newQty >= item.product.minOrder ? { ...item, quantity: newQty } : item
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const handleConfirmOrder = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Veuillez remplir votre nom et telephone")
      return
    }
    if (deliveryType === "delivery" && !customerAddress.trim()) {
      toast.error("Veuillez saisir votre adresse de livraison")
      return
    }

    // Build WhatsApp message
    const itemsText = cart.map(i => `- ${i.quantity}x ${i.product.name} (${(i.quantity * i.product.price).toLocaleString("fr-TN")} TND)`).join("\n")
    const message = encodeURIComponent(
      `Bonjour! Je souhaite commander:\n\n${itemsText}\n\nTotal: ${cartTotal.toLocaleString("fr-TN")} TND\n\nNom: ${customerName}\nTel: ${customerPhone}${deliveryType === "delivery" ? `\nAdresse: ${customerAddress}` : "\nRetrait en boutique"}${notes ? `\nNote: ${notes}` : ""}`
    )

    toast.success("Commande envoyee!", {
      description: "Vous allez etre redirige vers WhatsApp pour confirmer",
    })

    // Reset
    setCart([])
    setCartOpen(false)
    setCheckoutStep("cart")
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    setNotes("")

    // Open WhatsApp
    const whatsappNumber = info?.whatsapp.replace(/\s/g, "").replace("+", "")
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank")
  }

  const categories = Array.from(new Set(catalog.map(p => p.category)))

  if (!info) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Boutique non trouvee</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      {/* Store Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-card"
              style={{ backgroundColor: info.color }}
            >
              {info.logo}
            </div>
            <div>
              <h1 className="font-semibold text-sm">{info.name}</h1>
              <p className="text-xs text-muted-foreground">Catalogue en ligne</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`tel:${info.phone.replace(/\s/g, "")}`} className="hidden sm:block">
              <Button variant="outline" size="sm" className="bg-transparent">
                <Phone className="mr-2 h-3.5 w-3.5" />
                Appeler
              </Button>
            </a>
            <Button
              size="sm"
              className="relative"
              onClick={() => { setCartOpen(true); setCheckoutStep("cart") }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Panier
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Contact bar */}
      <div className="bg-muted/50 border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-center gap-4 px-4 py-2 text-xs text-muted-foreground">
          <a href={`tel:${info.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Phone className="h-3 w-3" />
            {info.phone}
          </a>
          <span>|</span>
          <a href={`https://wa.me/${info.whatsapp.replace(/\s/g, "").replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Products */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold mb-4">{category}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.filter(p => p.category === category).map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      crossOrigin="anonymous"
                    />
                    {product.tags.includes("populaire") && (
                      <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">Populaire</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-lg font-bold">{product.price.toLocaleString("fr-TN")} TND</span>
                        <span className="text-xs text-muted-foreground ml-1">/ {product.unit}</span>
                      </div>
                      {product.weight && <Badge variant="outline">{product.weight}</Badge>}
                    </div>
                    {product.minOrder > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">Min. {product.minOrder} {product.unit}s</p>
                    )}
                    <Button className="w-full mt-3" size="sm" onClick={() => addToCart(product)}>
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Ajouter au panier
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Floating cart button on mobile */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-30">
          <Button className="w-full py-6" onClick={() => { setCartOpen(true); setCheckoutStep("cart") }}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Voir le panier ({cartCount} article{cartCount > 1 ? "s" : ""}) - {cartTotal.toLocaleString("fr-TN")} TND
          </Button>
        </div>
      )}

      {/* Cart / Checkout Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {checkoutStep === "cart" && (
            <>
              <SheetHeader>
                <SheetTitle>Votre panier</SheetTitle>
                <SheetDescription>{cartCount} article{cartCount > 1 ? "s" : ""}</SheetDescription>
              </SheetHeader>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Votre panier est vide</p>
                  <Button variant="outline" className="mt-4 bg-transparent" onClick={() => setCartOpen(false)}>
                    Parcourir les produits
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex gap-3 rounded-lg border p-3">
                        <div className="relative h-16 w-16 rounded bg-muted overflow-hidden shrink-0">
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product.price.toLocaleString("fr-TN")} TND / {item.product.unit}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent" onClick={() => updateCartQuantity(item.product.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent" onClick={() => updateCartQuantity(item.product.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{(item.quantity * item.product.price).toLocaleString("fr-TN")} TND</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-lg border p-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{cartTotal.toLocaleString("fr-TN")} TND</span>
                    </div>
                  </div>

                  <SheetFooter className="mt-6">
                    <Button className="w-full" onClick={() => setCheckoutStep("info")}>
                      Commander
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </SheetFooter>
                </>
              )}
            </>
          )}

          {checkoutStep === "info" && (
            <>
              <SheetHeader>
                <SheetTitle>Vos informations</SheetTitle>
                <SheetDescription>Pour finaliser votre commande</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="store-name" className="pl-10" placeholder="Votre nom" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-phone">Telephone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="store-phone" className="pl-10" placeholder="+216 XX XXX XXX" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mode de livraison</Label>
                  <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as "pickup" | "delivery")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Retrait en boutique</SelectItem>
                      <SelectItem value="delivery">Livraison a domicile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deliveryType === "delivery" && (
                  <div className="space-y-2">
                    <Label htmlFor="store-address">Adresse de livraison *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea id="store-address" className="pl-10" placeholder="Votre adresse complete" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="store-notes">Notes (optionnel)</Label>
                  <Textarea id="store-notes" placeholder="Instructions speciales, allergies..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>

                {/* Order summary */}
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-sm font-medium">Recapitulatif</h4>
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.product.name}</span>
                      <span>{(item.quantity * item.product.price).toLocaleString("fr-TN")} TND</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{cartTotal.toLocaleString("fr-TN")} TND</span>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setCheckoutStep("cart")} className="bg-transparent">
                  Retour
                </Button>
                <Button onClick={handleConfirmOrder} className="flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer via WhatsApp
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
