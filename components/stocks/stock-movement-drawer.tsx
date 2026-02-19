"use client"

import { useState } from "react"
import { Plus, Minus, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Package, Loader2 } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { useStorageLocations, useRawMaterials, useFinishedProducts, useStockMovements } from "@/hooks/use-tenant-data"
import { createStockMovement } from "@/lib/stocks/actions"

interface StockMovementDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { id: string; name: string; type: "raw" | "finished" | "packaging"; unit?: string } | null
}

export function StockMovementDrawer({ open, onOpenChange, item }: StockMovementDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: locations = [] } = useStorageLocations()
  const { mutate: mutateRaw } = useRawMaterials()
  const { mutate: mutateFinished } = useFinishedProducts()
  const { mutate: mutateMovements } = useStockMovements()

  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [fromLocationId, setFromLocationId] = useState("")
  const [saving, setSaving] = useState(false)

  const activeLocations = locations.filter((l) => l.isActive)

  const resetForm = () => {
    setQuantity("")
    setReason("")
    setToLocationId("")
    setFromLocationId("")
  }

  const handleSubmit = async (action: "entree" | "sortie" | "transfert") => {
    if (!quantity || Number(quantity) <= 0) {
      toast.error("Veuillez entrer une quantite valide")
      return
    }
    if (!item) {
      toast.error("Aucun article selectionne")
      return
    }
    if (action === "transfert" && fromLocationId === toLocationId) {
      toast.error("Les emplacements source et destination doivent etre differents")
      return
    }

    setSaving(true)
    try {
      const itemType = item.type === "raw" ? "raw_material" : item.type === "finished" ? "finished_product" : "packaging"
      const success = await createStockMovement(currentTenant.id, {
        itemType,
        rawMaterialId: item.type === "raw" ? item.id : undefined,
        finishedProductId: item.type === "finished" ? item.id : undefined,
        packagingId: item.type === "packaging" ? item.id : undefined,
        movementType: action,
        quantity: Number(quantity),
        unit: item.unit || "kg",
        reason: reason || undefined,
        fromLocationId: (action === "sortie" || action === "transfert") ? fromLocationId || undefined : undefined,
        toLocationId: (action === "entree" || action === "transfert") ? toLocationId || undefined : undefined,
      })

      if (success) {
        const labels = { entree: "Entree de stock", sortie: "Sortie de stock", transfert: "Transfert" }
        toast.success(`${labels[action]} enregistre`, {
          description: `${quantity} ${item.unit || "unites"} de ${item.name}`,
        })
        mutateRaw()
        mutateFinished()
        mutateMovements()
        resetForm()
        onOpenChange(false)
      } else {
        toast.error("Erreur lors de l'enregistrement")
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {item ? `Mouvement: ${item.name}` : "Mouvement de stock"}
              </h2>
              <p className="text-sm text-primary-foreground/70">Entree, sortie ou transfert</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Tabs defaultValue="entree">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/70 p-1">
              <TabsTrigger value="entree" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Entree
              </TabsTrigger>
              <TabsTrigger value="sortie" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                Sortie
              </TabsTrigger>
              <TabsTrigger value="transfert" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transfert
              </TabsTrigger>
            </TabsList>

            {/* Entree */}
            <TabsContent value="entree" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quantite ({item?.unit || "unites"})</Label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0"
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 text-lg font-semibold text-center h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Motif</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Selectionner un motif" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Achat fournisseur">Achat fournisseur</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Retour client">Retour client</SelectItem>
                      <SelectItem value="Ajustement inventaire">Ajustement inventaire</SelectItem>
                      <SelectItem value="Don / Cadeau">Don / Cadeau</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {activeLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Destination</Label>
                    <Select value={toLocationId} onValueChange={setToLocationId}>
                      <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir un emplacement" /></SelectTrigger>
                      <SelectContent>
                        {activeLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}{loc.designation ? ` - ${loc.designation}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-11" onClick={() => handleSubmit("entree")} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {"Enregistrer l'entree"}
              </Button>
            </TabsContent>

            {/* Sortie */}
            <TabsContent value="sortie" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quantite ({item?.unit || "unites"})</Label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0"
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-destructive/30 text-lg font-semibold text-center h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Motif</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Selectionner un motif" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vente">Vente</SelectItem>
                      <SelectItem value="Utilisation production">Utilisation production</SelectItem>
                      <SelectItem value="Perte / Perime">Perte / Perime</SelectItem>
                      <SelectItem value="Ajustement inventaire">Ajustement inventaire</SelectItem>
                      <SelectItem value="Casse">Casse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {activeLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Depuis</Label>
                    <Select value={fromLocationId} onValueChange={setFromLocationId}>
                      <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir un emplacement" /></SelectTrigger>
                      <SelectContent>
                        {activeLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}{loc.designation ? ` - ${loc.designation}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button className="w-full rounded-xl h-11" variant="destructive" onClick={() => handleSubmit("sortie")} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Minus className="mr-2 h-4 w-4" />}
                Enregistrer la sortie
              </Button>
            </TabsContent>

            {/* Transfert */}
            <TabsContent value="transfert" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quantite ({item?.unit || "unites"})</Label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0"
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 text-lg font-semibold text-center h-12"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">De</Label>
                    <Select value={fromLocationId} onValueChange={setFromLocationId}>
                      <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>
                        {activeLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground mb-2.5" />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Vers</Label>
                    <Select value={toLocationId} onValueChange={setToLocationId}>
                      <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Destination" /></SelectTrigger>
                      <SelectContent>
                        {activeLocations.filter((l) => l.id !== fromLocationId).map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Motif (optionnel)</Label>
                  <Input
                    placeholder="Ex: Besoin laboratoire"
                    value={reason} onChange={(e) => setReason(e.target.value)}
                    className="bg-muted/50 border-0"
                  />
                </div>
              </div>
              <Button className="w-full rounded-xl h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => handleSubmit("transfert")} disabled={saving || !fromLocationId || !toLocationId}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
                Effectuer le transfert
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
