"use client"

import { useState, useEffect, useMemo, useTransition, useCallback } from "react"
import { Plus, Minus, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Package, Loader2, Search, MapPin, Warehouse } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createStockMovement, fetchItemStockByLocation, type ItemLocationStock } from "@/lib/stocks/actions"
import { useSWRConfig } from "swr"

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
  const { mutate: globalMutate } = useSWRConfig()
  const { data: locations = [] } = useStorageLocations()
  const { data: rawMaterials = [], mutate: mutateRaw } = useRawMaterials()
  const { data: finishedProducts = [], mutate: mutateFinished } = useFinishedProducts()
  const { data: packagingItems = [], mutate: mutatePkg } = usePackaging()
  const { mutate: mutateMovements } = useStockMovements()

  const [selectedItemId, setSelectedItemId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [deferredSearch, setDeferredSearch] = useState("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [fromLocationId, setFromLocationId] = useState("")
  const [saving, setSaving] = useState(false)
  const [locationStocks, setLocationStocks] = useState<ItemLocationStock[]>([])
  const [loadingLocationStocks, setLoadingLocationStocks] = useState(false)
  const [, startTransition] = useTransition()

  const MAX_VISIBLE_ITEMS = 30

  const activeLocations = locations.filter((l) => l.isActive)

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    startTransition(() => {
      setDeferredSearch(value)
    })
  }, [])

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

  // Fetch stock by location when an item is selected
  useEffect(() => {
    if (!activeItem || !currentTenant?.id) {
      setLocationStocks([])
      return
    }
    const typeMap: Record<string, string> = {
      raw: "raw_material",
      finished: "finished_product",
      packaging: "packaging",
      consumable: "consumable",
    }
    const itemType = typeMap[activeItem.type] || "raw_material"
    setLoadingLocationStocks(true)
    fetchItemStockByLocation(currentTenant.id, itemType, activeItem.id)
      .then((data) => setLocationStocks(data))
      .catch(() => setLocationStocks([]))
      .finally(() => setLoadingLocationStocks(false))
  }, [activeItem?.id, activeItem?.type, currentTenant?.id, open])

  const filteredItems = useMemo(() => {
    const base = deferredSearch ? allItems.filter((i) => i.name.toLowerCase().includes(deferredSearch.toLowerCase())) : allItems
    return base.slice(0, MAX_VISIBLE_ITEMS)
  }, [allItems, deferredSearch, MAX_VISIBLE_ITEMS])

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
    setLocationStocks([])
    setDeferredSearch("")
  }

  const handleSubmit = async (action: "entree" | "sortie" | "transfert") => {
    if (!activeItem) {
      toast.error("Veuillez selectionner un article")
      return
    }
    const qty = Number(quantity)
    if (!quantity || qty <= 0) {
      toast.error("Veuillez entrer une quantite valide")
      return
    }
    // Validate stock for sortie/transfert (basic client-side check on global stock)
    // The server does the precise per-depot validation and will reject if insufficient
    if ((action === "sortie" || action === "transfert") && qty > activeItem.currentStock) {
      toast.error("Stock insuffisant", {
        description: `Stock global disponible: ${activeItem.currentStock} ${activeItem.unit}, demande: ${qty} ${activeItem.unit}`,
      })
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
        
        // Revalidate SWR cache for dashboard
        globalMutate((key) => typeof key === "string" && (
          key.includes("raw_materials") || 
          key.includes("finished_products") || 
          key.includes("critical_stock") ||
          key.includes(currentTenant.id)
        ), undefined, { revalidate: true })
        
        resetForm()
        onOpenChange(false)
      } else {
        toast.error("Erreur lors de l'enregistrement")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.startsWith("STOCK_INSUFFISANT:")) {
        toast.error("Stock insuffisant", { description: msg.replace("STOCK_INSUFFISANT:", "") })
      } else {
        toast.error("Erreur", { description: msg || "Erreur lors de l'enregistrement" })
      }
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

    // If an item is already selected from the list, show it with option to change
    if (selectedItemId && activeItem) {
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Article *</Label>
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{activeItem.name}</p>
              <p className="text-[10px] text-muted-foreground">{typeLabel(activeItem.type)} &middot; Stock: {activeItem.currentStock} {activeItem.unit}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => { setSelectedItemId(""); setSearchQuery(""); setDeferredSearch("") }}>
              Changer
            </Button>
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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
        {allItems.length === 0 ? (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 text-center">
            Aucun article en stock. Creez des matieres premieres, produits finis ou emballages d&apos;abord.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
            {filteredItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun resultat pour &quot;{searchQuery}&quot;</p>
            ) : (
              filteredItems.map((i) => (
                  <button
                  key={i.id}
                  type="button"
                  onClick={() => { startTransition(() => { setSelectedItemId(i.id) }); setSearchQuery(""); setDeferredSearch("") }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between"
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
        )}
      </div>
    )
  }

  const renderQuantityField = (color = "primary", showStockLimit = false) => {
    const qty = Number(quantity) || 0
    const stockAvailable = activeItem?.currentStock ?? 0
    const isOverStock = showStockLimit && qty > stockAvailable

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Quantite ({activeItem?.unit || "unites"}) *</Label>
          {showStockLimit && activeItem && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isOverStock ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>
              Dispo: {stockAvailable} {activeItem.unit}
            </span>
          )}
        </div>
        <Input
          type="number" min="0" step="0.01" placeholder="0"
          value={quantity} onChange={(e) => setQuantity(e.target.value)}
          className={`bg-muted/50 border-0 text-lg font-semibold text-center h-12 ${isOverStock ? "ring-2 ring-red-400 focus-visible:ring-red-400" : `focus-visible:ring-1 focus-visible:ring-${color}/30`}`}
        />
        {isOverStock && (
          <p className="text-[11px] text-red-600 font-medium">
            Quantite superieure au stock disponible ({stockAvailable} {activeItem?.unit})
          </p>
        )}
      </div>
    )
  }

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
          <SelectTrigger className="bg-muted/50 border-0 w-full min-w-0">
            <span className="truncate block text-left">
              {value ? (filtered.find((l) => l.id === value)?.name || "Choisir un emplacement") : "Choisir un emplacement"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {filtered.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                <span className="truncate">{loc.name}{loc.designation ? ` - ${loc.designation}` : ""}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const renderLocationStockPanel = () => {
    if (!activeItem) return null
    const totalLocationStock = locationStocks.reduce((sum, ls) => sum + ls.quantity, 0)
    const unassigned = activeItem.currentStock - totalLocationStock

    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Warehouse className="h-3.5 w-3.5" />
          Repartition par depot
          <span className="ml-auto font-semibold text-foreground">{activeItem.currentStock} {activeItem.unit}</span>
        </div>
        {loadingLocationStocks ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : locationStocks.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 italic py-1">
            Aucune repartition - stock non affecte a un depot
          </p>
        ) : (
          <div className="space-y-1.5">
            {locationStocks.map((ls) => (
              <div key={ls.locationId} className="flex items-center gap-2">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="text-xs truncate flex-1">{ls.locationName}</span>
                <Progress
                  value={activeItem.currentStock > 0 ? (ls.quantity / activeItem.currentStock) * 100 : 0}
                  className="h-1.5 w-16"
                />
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-semibold min-w-[60px] justify-center">
                  {ls.quantity} {activeItem.unit}
                </Badge>
              </div>
            ))}
            {unassigned > 0 && (
              <div className="flex items-center gap-2 opacity-60">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="text-xs truncate flex-1 italic">Non affecte</span>
                <Progress value={activeItem.currentStock > 0 ? (unassigned / activeItem.currentStock) * 100 : 0} className="h-1.5 w-16" />
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-semibold min-w-[60px] justify-center">
                  {unassigned} {activeItem.unit}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
<Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
    <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
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
                {renderItemSelector()}
                {renderLocationStockPanel()}
                {renderQuantityField("primary")}
                {renderReasonSelect(["Achat fournisseur", "Production", "Retour client", "Ajustement inventaire", "Don / Cadeau"])}
                {renderLocationSelect("Destination", toLocationId, setToLocationId)}
              </div>
              <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-11" onClick={() => handleSubmit("entree")} disabled={saving || !activeItem || !quantity}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {"Enregistrer l'entree"}
              </Button>
            </TabsContent>

            {/* Sortie */}
            <TabsContent value="sortie" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                {renderItemSelector()}
                {renderLocationStockPanel()}
                {renderQuantityField("destructive", true)}
                {renderReasonSelect(["Vente", "Utilisation production", "Perte / Perime", "Ajustement inventaire", "Casse"])}
                {renderLocationSelect("Depuis", fromLocationId, setFromLocationId)}
              </div>
              <Button className="w-full rounded-xl h-11" variant="destructive" onClick={() => handleSubmit("sortie")} disabled={saving || !activeItem || !quantity}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Minus className="mr-2 h-4 w-4" />}
                Enregistrer la sortie
              </Button>
            </TabsContent>

            {/* Transfert */}
            <TabsContent value="transfert" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                {renderItemSelector()}
                {renderLocationStockPanel()}
                {renderQuantityField("primary", true)}
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <Label className="text-xs font-medium">De (source) *</Label>
                    <span />
                    <Label className="text-xs font-medium">Vers (destination) *</Label>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <div className="min-w-0">
                      <Select value={fromLocationId} onValueChange={setFromLocationId}>
                        <SelectTrigger className="bg-muted/50 border-0 w-full min-w-0">
                          <span className="truncate block text-left">
                            {fromLocationId ? (activeLocations.find((l) => l.id === fromLocationId)?.name || "Source") : "Source"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {activeLocations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <span className="truncate">{loc.name}{loc.designation ? ` (${loc.designation})` : ""}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <Select value={toLocationId} onValueChange={setToLocationId}>
                        <SelectTrigger className="bg-muted/50 border-0 w-full min-w-0">
                          <span className="truncate block text-left">
                            {toLocationId ? (activeLocations.filter((l) => l.id !== fromLocationId).find((l) => l.id === toLocationId)?.name || "Destination") : "Destination"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {activeLocations.filter((l) => l.id !== fromLocationId).map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <span className="truncate">{loc.name}{loc.designation ? ` (${loc.designation})` : ""}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {activeLocations.length === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 text-center">
                    Aucun emplacement. Allez dans Stocks &gt; Reserves pour en creer.
                  </p>
                )}
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
      </DialogContent>
    </Dialog>
  )
}
