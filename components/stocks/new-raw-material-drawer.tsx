"use client"

import { useState } from "react"
import { FlaskConical, Loader2, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createRawMaterial } from "@/lib/stocks/actions"
import { useStorageLocations } from "@/hooks/use-tenant-data"
import { BarcodeInput } from "@/components/ui/barcode-input"
import { useSWRConfig } from "swr"

const UNITS = [
  { value: "kg", label: "Kilogrammes (kg)" },
  { value: "g", label: "Grammes (g)" },
  { value: "L", label: "Litres (L)" },
  { value: "mL", label: "Millilitres (mL)" },
  { value: "pcs", label: "Pièces (pcs)" },
  { value: "boîtes", label: "Boîtes" },
  { value: "sachets", label: "Sachets" },
]

interface NewRawMaterialDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewRawMaterialDrawer({ open, onOpenChange, onSuccess }: NewRawMaterialDrawerProps) {
  const { currentTenant } = useTenant()
  const { mutate: globalMutate } = useSWRConfig()
  const { data: storageLocations } = useStorageLocations()
  const [saving, setSaving] = useState(false)
  
  // États du formulaire
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("kg")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("5")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [supplier, setSupplier] = useState("")
  const [barcode, setBarcode] = useState("")
  const [storageLocationId, setStorageLocationId] = useState("")

  const activeLocations = (storageLocations || []).filter(l => l.isActive)

  function resetForm() {
    setName("")
    setUnit("kg")
    setCurrentStock("")
    setMinStock("5")
    setPricePerUnit("")
    setSupplier("")
    setBarcode("")
    setStorageLocationId("")
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
    if (!pricePerUnit || validateNumber(pricePerUnit) <= 0) { 
      toast.error("Le prix unitaire est obligatoire") 
      return 
    }

    if (!currentTenant.id || currentTenant.id === "__fallback__") {
      toast.error("Session non initialisée", { 
        description: "Veuillez rafraîchir la page" 
      })
      return
    }

    setSaving(true)
    try {
      const result = await createRawMaterial(currentTenant.id, {
        name: name.trim(),
        unit,
        currentStock: validateNumber(currentStock),
        minStock: validateNumber(minStock, 5),
        pricePerUnit: validateNumber(pricePerUnit),
        supplier: supplier.trim() || undefined,
        barcode: barcode.trim() || undefined,
        storageLocationId: storageLocationId || undefined,
      })
      if (result) {
        toast.success("Matière première ajoutée", { description: name.trim() })
        
        // Revalidate SWR cache for dashboard
        globalMutate((key) => typeof key === "string" && (
          key.includes("raw_materials") || 
          key.includes("critical_stock") ||
          key.includes(currentTenant.id)
        ), undefined, { revalidate: true })
        
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
        toast.error("Matière première similaire détectée", { 
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
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm">
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-primary-foreground text-lg">Nouvelle matière première</DialogTitle>
                <p className="text-primary-foreground/80 text-sm">Farine, sucre, beurre, œufs...</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Info générale */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" aria-hidden="true" />
              Informations
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Nom *</Label>
              <Input id="name" placeholder="Ex: Farine T55, Sucre glace, Beurre..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-xs text-muted-foreground">Unité *</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="unit" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-xs text-muted-foreground">Fournisseur</Label>
                <Input id="supplier" placeholder="Ex: Moulin du Sud" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-xs text-muted-foreground">Code-barres</Label>
                <BarcodeInput id="barcode" value={barcode} onChange={setBarcode} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" /> Emplacement *
                </Label>
                <Select value={storageLocationId} onValueChange={setStorageLocationId}>
                  <SelectTrigger id="location" className={`w-full ${!storageLocationId || storageLocationId === "none" ? "border-destructive/50" : ""}`}>
                    <SelectValue placeholder="Choisir un dépôt (obligatoire)" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}{loc.designation ? ` (${loc.designation})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stock & Prix */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">S</span>
              Stock et prix
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="currentStock" className="text-xs text-muted-foreground">Stock actuel</Label>
                <Input id="currentStock" type="number" min="0" step="0.1" placeholder="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock" className="text-xs text-muted-foreground">Seuil min.</Label>
                <Input id="minStock" type="number" min="0" step="0.1" placeholder="5" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs text-muted-foreground">Prix/u (TND) *</Label>
                <Input id="price" type="number" min="0" step="0.001" placeholder="0.000" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} />
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
              <FlaskConical className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {saving ? "Enregistrement..." : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
