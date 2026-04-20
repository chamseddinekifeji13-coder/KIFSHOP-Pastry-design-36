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
import { createConsumable, CONSUMABLE_CATEGORIES } from "@/lib/stocks/actions"
import { useStorageLocations } from "@/hooks/use-tenant-data"

const UNITS = [
  { value: "unité", label: "Unité" },
  { value: "pcs", label: "Pièces (pcs)" },
  { value: "kg", label: "Kilogrammes (kg)" },
  { value: "L", label: "Litres (L)" },
  { value: "rouleaux", label: "Rouleaux" },
  { value: "boîtes", label: "Boîtes" },
  { value: "lots", label: "Lots" },
]

interface NewConsumableDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewConsumableDrawer({ open, onOpenChange, onSuccess }: NewConsumableDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: storageLocations } = useStorageLocations()
  const activeLocations = (storageLocations || []).filter(l => l.isActive)
  const [saving, setSaving] = useState(false)
  
  // États du formulaire
  const [name, setName] = useState("")
  const [storageLocationId, setStorageLocationId] = useState("")
  const [category, setCategory] = useState("general")
  const [unit, setUnit] = useState("unité")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("5")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const [supplier, setSupplier] = useState("")

  function resetForm() {
    setName("")
    setCategory("general")
    setUnit("unité")
    setStorageLocationId("")
    setCurrentStock("")
    setMinStock("5")
    setPrice("")
    setDescription("")
    setSupplier("")
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
    if (!storageLocationId) { 
      toast.error("Le dépôt est obligatoire", { 
        description: "Veuillez sélectionner un emplacement de stockage" 
      }) 
      return 
    }

    setSaving(true)
    try {
      const result = await createConsumable(currentTenant.id, {
        name: name.trim(),
        category,
        unit,
        currentStock: validateNumber(currentStock),
        minStock: validateNumber(minStock, 5),
        price: validateNumber(price),
        description: description.trim() || undefined,
        supplier: supplier.trim() || undefined,
        storageLocationId: storageLocationId || undefined,
      })
      
      if (result) {
        toast.success("Consommable ajouté", { description: name.trim() })
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
        toast.error("Consommable similaire détecté", { description: msg.replace("SIMILAR:", "") })
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
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-primary-foreground text-lg">Nouveau consommable</DialogTitle>
                <p className="text-primary-foreground/80 text-sm">Produits non utilisés comme matière première</p>
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
              <Input id="name" placeholder="Ex: Gants jetables, Liquide vaisselle..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs text-muted-foreground">Catégorie</Label>
                <select
                  id="category"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {Object.entries(CONSUMABLE_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
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
                placeholder="Marque, référence, usage..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-xs text-muted-foreground">Fournisseur (optionnel)</Label>
              <Input id="supplier" placeholder="Nom du fournisseur" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" /> 
                Dépôt / Emplacement *
              </Label>
              <select
                id="location"
                className={`h-9 w-full rounded-md border bg-background px-3 text-sm ${!storageLocationId ? "border-destructive/50" : "border-input"}`}
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
                <Input id="minStock" type="number" min="0" placeholder="5" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
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
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Package className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {saving ? "Enregistrement..." : "Ajouter le consommable"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
