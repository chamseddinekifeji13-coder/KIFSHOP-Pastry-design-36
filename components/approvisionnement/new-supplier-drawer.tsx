"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
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
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouveau fournisseur</SheetTitle>
          <SheetDescription>Ajoutez un fournisseur a votre carnet</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nom du fournisseur *</Label>
            <Input
              placeholder="Ex: Boulangerie Centrale"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Contact person */}
          <div className="space-y-2">
            <Label>Nom du contact</Label>
            <Input
              placeholder="Ex: Mohamed Ben Ali"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>Telephone</Label>
            <Input
              type="tel"
              placeholder="Ex: +216 71 234 567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Ex: contact@fournisseur.tn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Products */}
          <div className="space-y-2">
            <Label>Produits fournis</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Farine, Sucre, Beurre..."
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={handleProductKeyDown}
              />
              <Button type="button" variant="outline" size="icon" onClick={addProduct} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {products.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {products.map((product) => (
                  <Badge key={product} variant="secondary" className="gap-1 pr-1">
                    {product}
                    <button
                      type="button"
                      onClick={() => removeProduct(product)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Supprimer {product}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Tapez un produit et appuyez sur Entree ou cliquez +
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white"
              onClick={handleSubmit}
            >
              Ajouter le fournisseur
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
