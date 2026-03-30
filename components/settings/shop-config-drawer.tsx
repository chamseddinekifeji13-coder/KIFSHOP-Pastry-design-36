"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useTenant } from "@/lib/tenant-context"
import { toast } from "sonner"
import { Store, Building, Phone, Mail, Palette, Save, Loader2, AlertCircle, Camera, X } from "lucide-react"

interface ShopConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShopConfig {
  name: string
  primaryColor: string
  address: string
  phone: string
  email: string
  taxId: string
  logoUrl: string
}

const colorOptions = [
  { value: "#4A7C59", label: "Olive" },
  { value: "#2563eb", label: "Bleu" },
  { value: "#dc2626", label: "Rouge" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#ea580c", label: "Orange" },
  { value: "#0891b2", label: "Cyan" },
]

export function ShopConfigDrawer({ open, onOpenChange }: ShopConfigDrawerProps) {
  const { currentTenant, setCurrentTenant } = useTenant()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ShopConfig>({
    name: currentTenant.name,
    address: "",
    phone: "",
    email: "",
    taxId: "",
    primaryColor: currentTenant.primaryColor,
    logoUrl: "",
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    if (!open || currentTenant.id === "__fallback__") {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const res = await fetch("/api/shop-config", { 
        cache: "no-store",
        headers: {
          "X-Tenant-Id": currentTenant.id
        }
      })
      const data = await res.json()

      // Check HTTP status first
      if (!res.ok) {
        setLoadError(data.error || `Erreur ${res.status}: Impossible de charger la configuration`)
        setFormData({
          name: currentTenant.name,
          primaryColor: currentTenant.primaryColor,
          address: "",
          phone: "",
          email: "",
          taxId: "",
          logoUrl: "",
        })
      } else if (data.success && data.config) {
        setFormData({
          name: data.config.name || currentTenant.name,
          primaryColor: data.config.primaryColor || currentTenant.primaryColor,
          address: data.config.address || "",
          phone: data.config.phone || "",
          email: data.config.email || "",
          taxId: data.config.taxId || "",
          logoUrl: data.config.logoUrl || "",
        })
        setLoadError(null)
      } else {
        // Server returned 200 but no success flag
        setFormData({
          name: currentTenant.name,
          primaryColor: currentTenant.primaryColor,
          address: "",
          phone: "",
          email: "",
          taxId: "",
          logoUrl: "",
        })
        setLoadError(null)
      }
    } catch {
      setLoadError("Impossible de charger la configuration")
      setFormData({
        name: currentTenant.name,
        primaryColor: currentTenant.primaryColor,
        address: "",
        phone: "",
        email: "",
        taxId: "",
        logoUrl: "",
      })
    } finally {
      setIsLoading(false)
    }
  }, [open, currentTenant.id, currentTenant.name, currentTenant.primaryColor])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporte", { description: "Utilisez JPG, PNG ou WebP" })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", { description: "Maximum 2 Mo pour le logo" })
      return
    }

    setIsUploadingLogo(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formDataUpload })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload")
      setFormData(prev => ({ ...prev, logoUrl: data.url }))
      toast.success("Logo telecharge")
    } catch (err: any) {
      toast.error("Erreur lors de l'upload", { description: err.message })
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: "" }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom de la boutique est obligatoire")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/shop-config", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-Tenant-Id": currentTenant.id
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      // Check HTTP status first
      if (!res.ok) {
        const errMsg = data.details || data.error || `Erreur ${res.status}`
        toast.error("Erreur lors de la sauvegarde de la configuration", { 
          description: errMsg,
          duration: 5000
        })
      } else if (data.success) {
        setCurrentTenant({
          ...currentTenant,
          name: data.config.name,
          primaryColor: data.config.primaryColor,
          logo: data.config.name.charAt(0).toUpperCase(),
          logoUrl: data.config.logoUrl || "",
        })
        toast.success("Configuration mise a jour", {
          description: "Les modifications ont ete enregistrees avec succes.",
        })
        onOpenChange(false)
      } else {
        // Server returned 200 but no success flag
        const errMsg = data.details || data.error || "Erreur lors de la sauvegarde"
        toast.error("Erreur lors de la sauvegarde", { 
          description: errMsg,
          duration: 5000
        })
      }
    } catch (err: any) {
      toast.error("Erreur de connexion", { 
        description: err.message || "Veuillez reessayer."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {loadError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
            <Button variant="ghost" size="sm" onClick={loadConfig} className="ml-auto">
              Reessayer
            </Button>
          </div>
        )}

        {/* Identity */}
        <div className="space-y-3">
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
        <div className="space-y-3">
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
        <div className="space-y-3">
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
                    formData.primaryColor === color.value
                      ? "scale-110"
                      : "opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-xl border-2 transition-all ${
                      formData.primaryColor === color.value
                        ? "border-foreground shadow-lg"
                        : "border-transparent"
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
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <VisuallyHidden>
          <SheetTitle>Modifier la boutique</SheetTitle>
        </VisuallyHidden>
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
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <div className="relative">
              {formData.logoUrl ? (
                <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={formData.logoUrl}
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white shrink-0"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  {currentTenant.logo}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-foreground">{formData.name}</p>
              <p className="text-xs text-primary-foreground/60 mb-1">
                {formData.logoUrl ? "Logo personnalise" : "Logo par defaut"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="h-7 text-xs px-2 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                {isUploadingLogo ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3 mr-1" />
                )}
                {isUploadingLogo ? "Upload..." : "Changer le logo"}
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6">
          {renderBody()}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
