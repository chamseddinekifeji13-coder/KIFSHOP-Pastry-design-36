"use client"

import { useState } from "react"
import { FlaskConical, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createRawMaterial } from "@/lib/stocks/actions"

const UNITS = [
  { value: "kg", label: "Kilogrammes (kg)" },
  { value: "g", label: "Grammes (g)" },
  { value: "L", label: "Litres (L)" },
  { value: "mL", label: "Millilitres (mL)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "boites", label: "Boites" },
  { value: "sachets", label: "Sachets" },
]

interface NewRawMaterialDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewRawMaterialDrawer({ open, onOpenChange, onSuccess }: NewRawMaterialDrawerProps) {
  const { currentTenant } = useTenant()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("kg")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("5")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [supplier, setSupplier] = useState("")

  function resetForm() {
    setName(""); setUnit("kg"); setCurrentStock("")
    setMinStock("5"); setPricePerUnit(""); setSupplier("")
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Le nom est obligatoire"); return }
    if (!pricePerUnit || Number(pricePerUnit) <= 0) { toast.error("Le prix unitaire est obligatoire"); return }

    if (!currentTenant.id || currentTenant.id === "__fallback__") {
      toast.error("Session non initialisee", { description: "Veuillez rafraichir la page" })
      return
    }

    setSaving(true)
    try {
      const result = await createRawMaterial(currentTenant.id, {
        name: name.trim(),
        unit,
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 5,
        pricePerUnit: Number(pricePerUnit) || 0,
        supplier: supplier.trim() || undefined,
      })
      if (result) {
        toast.success("Matiere premiere ajoutee", { description: name.trim() })
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
      } else {
        toast.error("Erreur", { description: msg || "Erreur inattendue" })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] p-0 flex flex-col gap-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#4A7C59] to-[#3d6a4b] p-6 text-white">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-white text-lg">Nouvelle matiere premiere</SheetTitle>
                <p className="text-white/80 text-sm">Farine, sucre, beurre, oeufs...</p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Info generale */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[#4A7C59]" />
              Informations
            </h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nom *</Label>
              <Input placeholder="Ex: Farine T55, Sucre glace, Beurre..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Unite *</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fournisseur (optionnel)</Label>
                <Input placeholder="Ex: Moulin du Sud" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
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
                <Input type="number" min="0" step="0.1" placeholder="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Seuil minimum</Label>
                <Input type="number" min="0" step="0.1" placeholder="5" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prix/unite (TND) *</Label>
                <Input type="number" min="0" step="0.001" placeholder="0.000" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1 bg-[#4A7C59] hover:bg-[#3d6a4b] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
            {saving ? "Enregistrement..." : "Ajouter"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
