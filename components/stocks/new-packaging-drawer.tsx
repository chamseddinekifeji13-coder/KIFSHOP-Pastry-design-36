"use client"

import { useState } from "react"
import { Package, Loader2, X, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createPackaging } from "@/lib/stocks/actions"
import { useStorageLocations } from "@/hooks/use-tenant-data"

const PACKAGING_TYPES = [
  { value: "boite", label: "Boite" },
  { value: "plateau", label: "Plateau" },
  { value: "sachet", label: "Sachet" },
  { value: "pot", label: "Pot" },
  { value: "film", label: "Film alimentaire" },
  { value: "papier", label: "Papier" },
  { value: "ruban", label: "Ruban" },
  { value: "etiquette", label: "Etiquette" },
  { value: "autre", label: "Autre" },
]

const UNITS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "rouleaux", label: "Rouleaux" },
  { value: "m", label: "Metres (m)" },
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
  const [name, setName] = useState("")
  const [storageLocationId, setStorageLocationId] = useState("")
  const [type, setType] = useState("boite")
  const [unit, setUnit] = useState("pcs")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("10")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const activeLocations = (storageLocations || []).filter(l => l.isActive)

  function resetForm() {
    setName(""); setType("boite"); setUnit("pcs"); setStorageLocationId("")
    setCurrentStock(""); setMinStock("10"); setPrice(""); setDescription("")
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Le nom est obligatoire"); return }
    if (!storageLocationId || storageLocationId === "none") { toast.error("Le depot est obligatoire", { description: "Veuillez selectionner un emplacement de stockage" }); return }

    setSaving(true)
    try {
      const result = await createPackaging(currentTenant.id, {
        name: name.trim(), type, unit,
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 10,
        price: Number(price) || 0,
        description: description.trim() || undefined,
        storageLocationId: storageLocationId && storageLocationId !== "none" ? storageLocationId : undefined,
      })
      if (result) {
        toast.success("Emballage ajoute", { description: name.trim() })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error("Erreur lors de la creation")
      }
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.startsWith("DUPLICATE:")) {
        toast.error("Doublon detecte", { description: msg.replace("DUPLICATE:", "") })
      } else if (msg.startsWith("SIMILAR:")) {
        toast.error("Emballage similaire detecte", { 
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
    <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#D4A373] to-[#c4956a] p-6 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">Nouvel emballage</DialogTitle>
                <p className="text-white/80 text-sm">Boites, plateaux, sachets...</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Info generale */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-[#D4A373]" />
              Informations generales
            </h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nom *</Label>
              <Input placeholder="Ex: Boite patisserie 500g" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACKAGING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                placeholder="Dimensions, couleur, fournisseur..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Depot / Emplacement *
              </Label>
              <Select value={storageLocationId} onValueChange={setStorageLocationId}>
                <SelectTrigger className={`w-full ${!storageLocationId || storageLocationId === "none" ? "border-destructive/50" : ""}`}>
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
                <Input type="number" min="0" placeholder="10" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
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
          <Button className="flex-1 bg-[#D4A373] hover:bg-[#c4956a] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
            {saving ? "Enregistrement..." : "Ajouter l'emballage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
