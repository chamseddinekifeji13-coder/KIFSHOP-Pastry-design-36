"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { useTenant } from "@/lib/tenant-context"
import { toast } from "sonner"

interface ShopConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShopConfigDrawer({ open, onOpenChange }: ShopConfigDrawerProps) {
  const { currentTenant } = useTenant()
  
  const [formData, setFormData] = useState({
    name: currentTenant.name,
    address: "Avenue Habib Bourguiba, Tunis",
    phone: "+216 71 123 456",
    email: "contact@patisserie.tn",
    taxId: "1234567ABC",
    primaryColor: currentTenant.primaryColor,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    toast.success("Configuration mise a jour", {
      description: "Les modifications ont ete enregistrees avec succes.",
    })
    
    setIsSubmitting(false)
    onOpenChange(false)
  }

  const colorOptions = [
    { value: "#4A7C59", label: "Olive" },
    { value: "#2563eb", label: "Bleu" },
    { value: "#dc2626", label: "Rouge" },
    { value: "#7c3aed", label: "Violet" },
    { value: "#ea580c", label: "Orange" },
    { value: "#0891b2", label: "Cyan" },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier la boutique</SheetTitle>
          <SheetDescription>
            Mettez a jour les informations de votre etablissement
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Logo Preview */}
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-lg text-3xl font-bold text-white"
              style={{ backgroundColor: formData.primaryColor }}
            >
              {currentTenant.logo}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Logo actuel</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contactez le support pour changer le logo
              </p>
            </div>
          </div>

          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="shop-name">Nom de la boutique</Label>
            <Input
              id="shop-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nom de votre patisserie"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="shop-address">Adresse</Label>
            <Textarea
              id="shop-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Adresse complete"
              rows={2}
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shop-phone">Telephone</Label>
              <Input
                id="shop-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+216 XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-email">Email</Label>
              <Input
                id="shop-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.tn"
              />
            </div>
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="shop-tax">Matricule fiscal</Label>
            <Input
              id="shop-tax"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              placeholder="Numero de matricule fiscal"
            />
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label>Couleur principale</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, primaryColor: color.value })}
                  className={`h-10 w-10 rounded-lg border-2 transition-all ${
                    formData.primaryColor === color.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="bg-transparent"
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
