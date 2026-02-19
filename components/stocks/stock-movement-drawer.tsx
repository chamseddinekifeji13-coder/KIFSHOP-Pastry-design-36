"use client"

import { useState, useMemo } from "react"
import { Plus, Minus, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Package, Loader2, Search } from "lucide-react"
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
import {
  useStorageLocations,
  useRawMaterials,
  useFinishedProducts,
  usePackaging,
  useStockMovements,
} from "@/hooks/use-tenant-data"
import { createStockMovement } from "@/lib/stocks/actions"

interface ItemOption {
  id: string
  name: string
  type: "raw" | "finished" | "packaging"
  unit: string
  currentStock: number
}

interface StockMovementDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { id: string; name: string; type: "raw" | "finished" | "packaging"; unit?: string } | null
}

export function StockMovementDrawer({ open, onOpenChange, item }: StockMovementDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: locations = [] } = useStorageLocations()
  const { data: rawMaterials = [], mutate: mutateRaw } = useRawMaterials()
  const { data: finishedProducts = [], mutate: mutateFinished } = useFinishedProducts()
  const { data: packagingItems = [], mutate: mutatePkg } = usePackaging()
  const { mutate: mutateMovements } = useStockMovements()

  const [selectedItemId, setSelectedItemId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [fromLocationId, setFromLocationId] = useState("")
  const [saving, setSaving] = useState(false)

  const activeLocations = locations.filter((l) => l.isActive)

  // Build a unified list of all items for selection
  const allItems: ItemOption[] = useMemo(() => {
    const items: ItemOption[] = []
    rawMaterials.forEach((m) =>
      items.push({ id: m.id, name: m.name, type: "raw", unit: m.unit || "kg", currentStock: m.currentStock })
    )
    finishedProducts.forEach((p) =>
      items.push({ id: p.id, name: p.name, type: "finished", unit: p.unit || "pieces", currentStock: p.currentStock })
    )
    packagingItems.forEach((pk) =>
      items.push({ id: pk.id, name: pk.name, type: "packaging", unit: pk.unit || "pieces", currentStock: pk.currentStock })
    )
    return items
  }, [rawMaterials, finishedProducts, packagingItems])

  // Determine the active item (preselected or selected from list)
  const activeItem: ItemOption | null = useMemo(() => {
    if (item) {
      const found = allItems.find((i) => i.id === item.id)
      return found || { id: item.id, name: item.name, type: item.type, unit: item.unit || "kg", currentStock: 0 }
    }
    if (selectedItemId) {
      return allItems.find((i) => i.id === selectedItemId) || null
    }
    return null
  }, [item, selectedItemId, allItems])

  const filteredItems = useMemo(() => {
    if (!searchQuery) return allItems
    const q = searchQuery.toLowerCase()
    return allItems.filter((i) => i.name.toLowerCase().includes(q))
  }, [allItems, searchQuery])

  const typeLabel = (type: string) => {
    if (type === "raw") return "MP"
    if (type === "finished") return "PF"
    return "Emb."
  }

  const resetForm = () => {
    setQuantity("")
    setReason("")
    setToLocationId("")
    setFromLocationId("")
    setSelectedItemId("")
    setSearchQuery("")
  }

  const handleSubmit = async (action: "entree" | "sortie" | "transfert") => {
    if (!activeItem) {
      toast.error("Veuillez selectionner un article")
      return
    }
    if (!quantity || Number(quantity) <= 0) {
      toast.error("Veuillez entrer une quantite valide")
      return
    }
    if (action === "transfert" && (!fromLocationId || !toLocationId)) {
      toast.error("Veuillez selectionner les emplacements source et destination")
      return
    }
    if (action === "transfert" && fromLocationId === toLocationId) {
      toast.error("Les emplacements source et destination doivent etre differents")
      return
    }

    setSaving(true)
    try {
      const itemType = activeItem.type === "raw" ? "raw_material" : activeItem.type === "finished" ? "finished_product" : "packaging"
      const success = await createStockMovement(currentTenant.id, {
        itemType,
        rawMaterialId: activeItem.type === "raw" ? activeItem.id : undefined,
        finishedProductId: activeItem.type === "finished" ? activeItem.id : undefined,
        packagingId: activeItem.type === "packaging" ? activeItem.id : undefined,
        movementType: action,
        quantity: Number(quantity),
        unit: activeItem.unit,
        reason: reason || undefined,
        fromLocationId: (action === "sortie" || action === "transfert") ? fromLocationId || undefined : undefined,
        toLocationId: (action === "entree" || action === "transfert") ? toLocationId || undefined : undefined,
      })

      if (success) {
        const labels = { entree: "Entree de stock", sortie: "Sortie de stock", transfert: "Transfert" }
        toast.success(`${labels[action]} enregistre`, {
          description: `${quantity} ${activeItem.unit} de ${activeItem.name}`,
        })
        mutateRaw()
        mutateFinished()
        mutatePkg()
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

  // Reusable form fields per tab
  const renderItemSelector = () => {
    if (item) {
      return (
        <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{typeLabel(item.type)} &middot; Stock: {activeItem?.currentStock ?? 0} {activeItem?.unit}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">Article *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
        <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun article trouve</p>
          ) : (
            filteredItems.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => { setSelectedItemId(i.id); setSearchQuery("") }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                  selectedItemId === i.id ? "bg-primary/5 ring-1 ring-primary/20" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">{typeLabel(i.type)}</span>
                  <span className="font-medium">{i.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">{i.currentStock} {i.unit}</span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderQuantityField = (color = "primary") => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Quantite ({activeItem?.unit || "unites"})</Label>
      <Input
        type="number" min="0" step="0.01" placeholder="0"
        value={quantity} onChange={(e) => setQuantity(e.target.value)}
        className={`bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-${color}/30 text-lg font-semibold text-center h-12`}
      />
    </div>
  )

  const renderReasonSelect = (options: string[]) => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Motif</Label>
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Selectionner un motif" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  const renderLocationSelect = (label: string, value: string, onChange: (v: string) => void, excludeId?: string) => {
    if (activeLocations.length === 0) return null
    const filtered = excludeId ? activeLocations.filter((l) => l.id !== excludeId) : activeLocations
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir un emplacement" /></SelectTrigger>
          <SelectContent>
            {filtered.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}{loc.designation ? ` - ${loc.designation}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Mouvement de stock</h2>
              <p className="text-sm text-primary-foreground/70">Entree, sortie ou transfert</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Item selector at the top */}
          <div className="mb-5">
            {renderItemSelector()}
          </div>

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
                {renderQuantityField("primary")}
                {renderReasonSelect(["Achat fournisseur", "Production", "Retour client", "Ajustement inventaire", "Don / Cadeau"])}
                {renderLocationSelect("Destination", toLocationId, setToLocationId)}
              </div>
              <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-11" onClick={() => handleSubmit("entree")} disabled={saving || !activeItem}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {"Enregistrer l'entree"}
              </Button>
            </TabsContent>

            {/* Sortie */}
            <TabsContent value="sortie" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                {renderQuantityField("destructive")}
                {renderReasonSelect(["Vente", "Utilisation production", "Perte / Perime", "Ajustement inventaire", "Casse"])}
                {renderLocationSelect("Depuis", fromLocationId, setFromLocationId)}
              </div>
              <Button className="w-full rounded-xl h-11" variant="destructive" onClick={() => handleSubmit("sortie")} disabled={saving || !activeItem}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Minus className="mr-2 h-4 w-4" />}
                Enregistrer la sortie
              </Button>
            </TabsContent>

            {/* Transfert */}
            <TabsContent value="transfert" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                {renderQuantityField("primary")}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">De</Label>
                    <Select value={fromLocationId} onValueChange={setFromLocationId}>
                      <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>
                        {activeLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
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
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
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
              <Button className="w-full rounded-xl h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => handleSubmit("transfert")} disabled={saving || !activeItem || !fromLocationId || !toLocationId}>
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
