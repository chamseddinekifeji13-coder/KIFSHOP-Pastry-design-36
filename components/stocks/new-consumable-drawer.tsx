"use client"

import { useState } from "react"
import { Package, Loader2, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createConsumable, CONSUMABLE_CATEGORIES } from "@/lib/stocks/actions"
import { useStorageLocations } from "@/hooks/use-tenant-data"

const UNITS = [
  { value: "unite", label: "Unite" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilogrammes (kg)" },
  { value: "L", label: "Litres (L)" },
  { value: "rouleaux", label: "Rouleaux" },
  { value: "boites", label: "Boites" },
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
  const [name, setName] = useState("")
  const [storageLocationId, setStorageLocationId] = useState("")
  const [category, setCategory] = useState("general")
  const [unit, setUnit] = useState("unite")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("5")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const [supplier, setSupplier] = useState("")

  function resetForm() {
    setName(""); setCategory("general"); setUnit("unite"); setStorageLocationId("")
    setCurrentStock(""); setMinStock("5"); setPrice(""); setDescription(""); setSupplier("")
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Le nom est obligatoire"); return }
    if (!storageLocationId) { toast.error("Le depot est obligatoire", { description: "Veuillez selectionner un emplacement de stockage" }); return }

    setSaving(true)
    try {
      const result = await createConsumable(currentTenant.id, {
        name: name.trim(), category, unit,
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 5,
        price: Number(price) || 0,
        description: description.trim() || undefined,
        supplier: supplier.trim() || undefined,
        storageLocationId: storageLocationId || undefined,
      })
      if (result) {
        toast.success("Consommable ajoute", { description: name.trim() })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error("Erreur lors de la creation")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.startsWith("DUPLICATE:")) {
        toast.error("Doublon detecte", { description: msg.replace("DUPLICATE:", "") })
      } else if (msg.startsWith("SIMILAR:")) {
        toast.error("Consommable similaire detecte", { description: msg.replace("SIMILAR:", "") })
      } else {
        toast.error("Erreur", { description: msg || "Erreur inattendue" })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
<Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">Nouveau consommable</DialogTitle>
                <p className="text-white/80 text-sm">Produits non utilises comme matiere premiere</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Info generale */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Informations generales
            </h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nom *</Label>
              <Input placeholder="Ex: Gants jetables, Liquide vaisselle..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Categorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONSUMABLE_CATEGORIES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Unite</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description (optionnel)</Label>
              <Textarea
                placeholder="Marque, reference, usage..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fournisseur (optionnel)</Label>
              <Input placeholder="Nom du fournisseur" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Depot / Emplacement *
              </Label>
              <Select value={storageLocationId} onValueChange={setStorageLocationId}>
                <SelectTrigger className={`w-full ${!storageLocationId ? "border-destructive/50" : ""}`}>
                  <SelectValue placeholder="Choisir un depot (obligatoire)" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}{loc.designation ? ` (${loc.designation})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock & Prix */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#4A7C59]/10 text-[#4A7C59] text-xs font-bold">S</span>
              Stock et prix
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Stock actuel</Label>
                <Input type="number" min="0" placeholder="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Seuil minimum</Label>
                <Input type="number" min="0" placeholder="5" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prix unitaire (TND)</Label>
                <Input type="number" min="0" step="0.001" placeholder="0.000" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
            {saving ? "Enregistrement..." : "Ajouter le consommable"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
