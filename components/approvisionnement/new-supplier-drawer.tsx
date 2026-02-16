"use client"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Truck, User, Phone, Mail, Package } from "lucide-react"
import { toast } from "sonner"
import type { Supplier } from "@/lib/mock-data"

interface NewSupplierDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  onSupplierCreated: (supplier: Supplier) => void
}

export function NewSupplierDrawer({ open, onOpenChange, tenantId, onSupplierCreated }: NewSupplierDrawerProps) {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [productInput, setProductInput] = useState("")
  const [products, setProducts] = useState<string[]>([])

  function resetForm() {
    setName("")
    setContact("")
    setPhone("")
    setEmail("")
    setProductInput("")
    setProducts([])
  }

  function addProduct() {
    const trimmed = productInput.trim()
    if (trimmed && !products.includes(trimmed)) {
      setProducts((prev) => [...prev, trimmed])
      setProductInput("")
    }
  }

  function removeProduct(product: string) {
    setProducts((prev) => prev.filter((p) => p !== product))
  }

  function handleProductKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      addProduct()
    }
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Le nom du fournisseur est requis")
      return
    }

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      tenantId,
      name: name.trim(),
      contact: contact.trim() || name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      products,
      status: "actif",
    }

    onSupplierCreated(newSupplier)
    toast.success("Fournisseur ajoute", {
      description: newSupplier.name,
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau fournisseur</h2>
              <p className="text-sm text-primary-foreground/70">Ajoutez un fournisseur a votre carnet</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Identity Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Identite
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom du fournisseur *</Label>
                <Input
                  placeholder="Ex: Boulangerie Centrale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom du contact</Label>
                <Input
                  placeholder="Ex: Mohamed Ben Ali"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Coordonnees
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Telephone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+216 71 234 567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="contact@fournisseur.tn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Produits fournis
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex gap-2">
                <Input
                  placeholder="Farine, Sucre, Beurre..."
                  value={productInput}
                  onChange={(e) => setProductInput(e.target.value)}
                  onKeyDown={handleProductKeyDown}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
                <Button type="button" variant="outline" size="icon" onClick={addProduct} className="shrink-0 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {products.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {products.map((product) => (
                    <Badge
                      key={product}
                      variant="secondary"
                      className="gap-1.5 pr-1.5 py-1 px-3 rounded-full bg-primary/10 text-primary border-0 hover:bg-primary/15 transition-colors"
                    >
                      {product}
                      <button
                        type="button"
                        onClick={() => removeProduct(product)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Supprimer {product}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Tapez un produit et appuyez sur Entree
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
          >
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            onClick={handleSubmit}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
