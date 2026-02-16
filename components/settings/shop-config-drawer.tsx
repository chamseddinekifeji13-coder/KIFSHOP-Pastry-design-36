"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useTenant } from "@/lib/tenant-context"
import { toast } from "sonner"
import { Store, Building, Phone, Mail, Palette, Save } from "lucide-react"

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
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Modifier la boutique</h2>
              <p className="text-sm text-primary-foreground/70">Informations de votre etablissement</p>
            </div>
          </div>
          {/* Logo Preview */}
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white shrink-0"
              style={{ backgroundColor: formData.primaryColor }}
            >
              {currentTenant.logo}
            </div>
            <div>
              <p className="text-sm font-medium text-primary-foreground">{formData.name}</p>
              <p className="text-xs text-primary-foreground/60">Logo actuel</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Building className="h-3.5 w-3.5" />
              Identite
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom de la boutique</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Adresse</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Matricule fiscal</Label>
                <Input
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Contact
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Telephone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Palette className="h-3.5 w-3.5" />
              Couleur principale
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, primaryColor: color.value })}
                    className={`flex flex-col items-center gap-1.5 transition-all ${
                      formData.primaryColor === color.value ? "scale-110" : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-xl border-2 transition-all ${
                        formData.primaryColor === color.value ? "border-foreground shadow-lg" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all" onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
