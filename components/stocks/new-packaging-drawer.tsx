"use client"

import { useState } from "react"
import { Package, Loader2, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createPackaging } from "@/lib/stocks/actions"
import { useStorageLocations } from "@/hooks/use-tenant-data"

const PACKAGING_TYPES = [
  { value: "boîte", label: "Boîte" },
  { value: "plateau", label: "Plateau" },
  { value: "sachet", label: "Sachet" },
  { value: "pot", label: "Pot" },
  { value: "film", label: "Film alimentaire" },
  { value: "papier", label: "Papier" },
  { value: "ruban", label: "Ruban" },
  { value: "étiquette", label: "Étiquette" },
  { value: "autre", label: "Autre" },
]

const UNITS = [
  { value: "pcs", label: "Pièces (pcs)" },
  { value: "rouleaux", label: "Rouleaux" },
  { value: "m", label: "Mètres (m)" },
  { value: "kg", label: "Kilogrammes (kg)" },
  { value: "lots", label: "Lots" },
]

interface NewPackagingDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewPackagingDrawer({ open, onOpenChange, onSuccess }: NewPackagingDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: storageLocations } = useStorageLocations()
  const [saving, setSaving] = useState(false)
  
  // États du formulaire
  const [name, setName] = useState("")
  const [storageLocationId, setStorageLocationId] = useState("")
  const [type, setType] = useState("boîte")
  const [unit, setUnit] = useState("pcs")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("10")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const activeLocations = (storageLocations || []).filter(l => l.isActive)

  function resetForm() {
    setName("")
    setType("boîte")
    setUnit("pcs")
    setStorageLocationId("")
    setCurrentStock("")
    setMinStock("10")
    setPrice("")
    setDescription("")
  }

  function validateNumber(value: string, defaultValue: number = 0): number {
    const num = Number(value)
    return isNaN(num) || num < 0 ? defaultValue : num
  }

  async function handleSubmit() {
    if (!name.trim()) { 
      toast.error("Le nom est obligatoire") 
      return 
    }
    if (!storageLocationId || storageLocationId === "none") { 
      toast.error("Le dépôt est obligatoire", { 
        description: "Veuillez sélectionner un emplacement de stockage" 
      }) 
      return 
    }

    setSaving(true)
    try {
      const result = await createPackaging(currentTenant.id, {
        name: name.trim(),
        type,
        unit,
        currentStock: validateNumber(currentStock),
        minStock: validateNumber(minStock, 10),
        price: validateNumber(price),
        description: description.trim() || undefined,
        storageLocationId: storageLocationId && storageLocationId !== "none" ? storageLocationId : undefined,
      })
      if (result) {
        toast.success("Emballage ajouté", { description: name.trim() })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error("Erreur lors de la création")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.startsWith("DUPLICATE:")) {
        toast.error("Doublon détecté", { description: msg.replace("DUPLICATE:", "") })
      } else if (msg.startsWith("SIMILAR:")) {
        toast.error("Emballage similaire détecté", { 
          description: msg.replace("SIMILAR:", "") 
        })
      } else {
        toast.error("Erreur", { description: msg || "Erreur inattendue" })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-secondary to-secondary/80 p-6 text-secondary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-foreground/20 backdrop-blur-sm">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-secondary-foreground text-lg">Nouvel emballage</DialogTitle>
                <p className="text-secondary-foreground/80 text-sm">Boîtes, plateaux, sachets...</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Info générale */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" aria-hidden="true" />
              Informations générales
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Nom *</Label>
              <Input id="name" placeholder="Ex: Boîte pâtisserie 500g" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs text-muted-foreground">Type</Label>
                <select
                  id="type"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {PACKAGING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-xs text-muted-foreground">Unité</Label>
                <select
                  id="unit"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs text-muted-foreground">Description (optionnel)</Label>
              <Textarea
                id="description"
                placeholder="Dimensions, couleur, fournisseur..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" /> 
                Dépôt / Emplacement *
              </Label>
              <select
                id="location"
                className={`h-9 w-full rounded-md border bg-background px-3 text-sm ${!storageLocationId || storageLocationId === "none" ? "border-destructive/50" : "border-input"}`}
                value={storageLocationId}
                onChange={(e) => setStorageLocationId(e.target.value)}
              >
                <option value="">Choisir un dépôt (obligatoire)</option>
                {activeLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}{loc.designation ? ` (${loc.designation})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock & Prix */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                S
              </span>
              Stock et prix
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="currentStock" className="text-xs text-muted-foreground">Stock actuel</Label>
                <Input id="currentStock" type="number" min="0" placeholder="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock" className="text-xs text-muted-foreground">Seuil minimum</Label>
                <Input id="minStock" type="number" min="0" placeholder="10" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs text-muted-foreground">Prix unitaire (TND)</Label>
                <Input id="price" type="number" min="0" step="0.001" placeholder="0.000" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => onOpenChange(false)} 
            disabled={saving}
          >
            Annuler
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSubmit} 
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Package className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {saving ? "Enregistrement..." : "Ajouter l'emballage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
