"use client"

import { useState, useEffect } from "react"
import { Plus, Save, ClipboardCheck, Package, Check, AlertTriangle, RotateCcw, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTenant } from "@/lib/tenant-context"
import { useRawMaterials, useFinishedProducts } from "@/hooks/use-tenant-data"
import { saveInventorySession, applyInventoryCorrections } from "@/lib/stocks/actions"
import type { InventoryCountItem } from "@/lib/stocks/actions"
import { toast } from "sonner"

interface NewInventoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface CountItem {
  id: string; name: string; type: "mp" | "pf"
  theoreticalQty: number; physicalQty: string; unit: string; note: string
}

interface NewProduct {
  name: string; type: "mp" | "pf"; unit: string; physicalQty: string
}

export function NewInventoryDrawer({ open, onOpenChange, onSuccess }: NewInventoryDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: finishedProducts = [] } = useFinishedProducts()

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: "", type: "mp", unit: "kg", physicalQty: "" })
  const [activeTab, setActiveTab] = useState<"mp" | "pf">("mp")
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [discrepancyItems, setDiscrepancyItems] = useState<CountItem[]>([])

  const [counts, setCounts] = useState<CountItem[]>([])

  // Rebuild counts when materials change or drawer opens
  useEffect(() => {
    if (open) {
      setCounts([
        ...rawMaterials.map((m: any) => ({
          id: m.id, name: m.name, type: "mp" as const,
          theoreticalQty: m.currentStock || 0, physicalQty: "", unit: m.unit, note: ""
        })),
        ...finishedProducts.map((p: any) => ({
          id: p.id, name: p.name, type: "pf" as const,
          theoreticalQty: p.currentStock || 0, physicalQty: "", unit: p.unit, note: ""
        }))
      ])
      setSessionId(null)
      setDiscrepancyItems([])
    }
  }, [open, rawMaterials, finishedProducts])

  const updateCount = (id: string, field: "physicalQty" | "note", value: string) => {
    setCounts(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const resetCount = (id: string) => {
    setCounts(prev => prev.map(item => item.id === id ? { ...item, physicalQty: "", note: "" } : item))
  }

  const deleteCount = (id: string) => {
    // Only allow deleting manually added items (id starts with "new-")
    if (id.startsWith("new-")) {
      setCounts(prev => prev.filter(item => item.id !== id))
      toast.success("Ligne supprimee")
    }
  }

  const resetAllCounts = () => {
    setCounts(prev => prev.map(item => ({ ...item, physicalQty: "", note: "" })))
    toast.success("Toutes les saisies ont ete reintialisees")
  }

  const getDiscrepancy = (item: CountItem) => {
    if (!item.physicalQty) return null
    const physical = parseFloat(item.physicalQty)
    if (isNaN(physical)) return null
    return physical - item.theoreticalQty
  }

  const handleSubmit = async () => {
    const filledCounts = counts.filter(c => c.physicalQty !== "")
    if (filledCounts.length === 0) { toast.error("Veuillez saisir au moins un comptage"); return }

    setSaving(true)
    try {
      const items: InventoryCountItem[] = filledCounts.map(c => ({
        id: c.id, name: c.name, type: c.type,
        theoreticalQty: c.theoreticalQty, physicalQty: parseFloat(c.physicalQty),
        unit: c.unit, note: c.note,
      }))

      const id = await saveInventorySession(currentTenant.id, items)
      if (!id) { toast.error("Erreur lors de la sauvegarde"); return }

      const withDiscrepancies = filledCounts.filter(c => {
        const d = getDiscrepancy(c)
        return d !== null && d !== 0
      })

      if (withDiscrepancies.length > 0) {
        setSessionId(id)
        setDiscrepancyItems(withDiscrepancies)
        setConfirmOpen(true)
        toast.info(`${withDiscrepancies.length} ecart(s) detecte(s) - Choisissez quoi faire`)
      } else {
        toast.success(`Inventaire enregistre: ${filledCounts.length} articles, 0 ecart`)
        onOpenChange(false)
        onSuccess?.()
      }
    } catch {
      toast.error("Erreur inattendue")
    } finally {
      setSaving(false)
    }
  }

  const handleApplyCorrections = async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      const corrections = discrepancyItems.map(c => ({
        itemId: c.id,
        itemType: (c.type === "mp" ? "raw_material" : "finished_product") as "raw_material" | "finished_product",
        physicalQty: parseFloat(c.physicalQty),
        unit: c.unit,
      }))

      const ok = await applyInventoryCorrections(currentTenant.id, sessionId, corrections)
      if (ok) {
        toast.success(`Stock ajuste pour ${corrections.length} article(s)`)
      } else {
        toast.error("Erreur lors de la correction")
      }
    } catch {
      toast.error("Erreur inattendue")
    } finally {
      setSaving(false)
      setConfirmOpen(false)
      onOpenChange(false)
      onSuccess?.()
    }
  }

  const handleIgnoreDiscrepancies = () => {
    setConfirmOpen(false)
    toast.success("Inventaire enregistre sans correction de stock")
    onOpenChange(false)
    onSuccess?.()
  }

  const mpItems = counts.filter(c => c.type === "mp")
  const pfItems = counts.filter(c => c.type === "pf")

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) { toast.error("Veuillez saisir un nom"); return }
    if (!newProduct.physicalQty) { toast.error("Veuillez saisir la quantite"); return }
    setCounts(prev => [...prev, {
      id: `new-${Date.now()}`, name: newProduct.name, type: newProduct.type,
      theoreticalQty: 0, physicalQty: newProduct.physicalQty, unit: newProduct.unit, note: "Nouveau produit"
    }])
    setAddProductOpen(false)
    setNewProduct({ name: "", type: "mp", unit: "kg", physicalQty: "" })
    toast.success(`"${newProduct.name}" ajoute`)
  }

  const filledCount = (items: CountItem[]) => items.filter(c => c.physicalQty !== "").length

  const renderTable = (items: CountItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Article</TableHead>
          <TableHead className="text-right">Theorique</TableHead>
          <TableHead className="text-right">Physique</TableHead>
          <TableHead className="text-right">Ecart</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="w-16 text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun article. Ajoutez des produits dans Stocks d{"'"}abord.</TableCell></TableRow>
        ) : items.map((item) => {
          const discrepancy = getDiscrepancy(item)
          const isModified = item.physicalQty !== ""
          const isManual = item.id.startsWith("new-")
          return (
            <TableRow key={item.id} className={isModified ? "bg-primary/5" : ""}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  {item.name}
                  {isManual && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">Manuel</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{item.unit}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.theoreticalQty}</TableCell>
              <TableCell className="text-right">
                <div className="relative inline-flex items-center">
                  <Input type="number" step="0.01" value={item.physicalQty} onChange={(e) => updateCount(item.id, "physicalQty", e.target.value)}
                    className="w-24 text-right bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 pr-7" placeholder="-" />
                  <Pencil className="absolute right-2 h-3 w-3 text-muted-foreground/40 pointer-events-none" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                {discrepancy !== null && (
                  <Badge variant={discrepancy === 0 ? "secondary" : "destructive"}
                    className={`rounded-full text-xs ${discrepancy === 0 ? "bg-primary/10 text-primary border-0" : discrepancy > 0 ? "bg-green-100 text-green-700 border-0" : ""}`}>
                    {discrepancy > 0 ? "+" : ""}{discrepancy.toFixed(2)}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Input value={item.note} onChange={(e) => updateCount(item.id, "note", e.target.value)}
                  className="w-32 bg-muted/50 border-0" placeholder="Note..." />
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {isModified && (
                    <button onClick={() => resetCount(item.id)} title="Reinitialiser" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isManual && (
                    <button onClick={() => deleteCount(item.id)} title="Supprimer" className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><ClipboardCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold">Nouvel inventaire</h2>
                <p className="text-sm text-primary-foreground/70">Saisissez les quantites physiques comptees</p>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm text-primary-foreground/70">
              <span>Date: <strong className="text-primary-foreground">{new Date().toLocaleDateString("fr-FR")}</strong></span>
              <span>Boutique: <strong className="text-primary-foreground">{currentTenant?.name}</strong></span>
            </div>
          </div>

          <div className="flex-1 px-6 py-6">
            <Tabs defaultValue="mp" value={activeTab} onValueChange={(v) => setActiveTab(v as "mp" | "pf")} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="rounded-xl bg-muted/70 p-1">
                  <TabsTrigger value="mp" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                    <Package className="h-3.5 w-3.5" /> MP ({filledCount(mpItems)}/{mpItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="pf" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                    PF ({filledCount(pfItems)}/{pfItems.length})
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  {counts.some(c => c.physicalQty !== "") && (
                    <Button variant="ghost" size="sm" onClick={resetAllCounts} className="rounded-lg h-8 text-xs text-muted-foreground hover:text-destructive">
                      <RotateCcw className="mr-1.5 h-3 w-3" /> Tout reinitialiser
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setNewProduct(p => ({ ...p, type: activeTab })); setAddProductOpen(true) }} className="rounded-lg h-8 text-xs">
                    <Plus className="mr-1.5 h-3 w-3" /> Ajouter un produit
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <TabsContent value="mp" className="mt-0">{renderTable(mpItems)}</TabsContent>
                <TabsContent value="pf" className="mt-0">{renderTable(pfItems)}</TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={handleSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer l'inventaire"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog: Add new product */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader><DialogTitle>Ajouter un nouveau produit</DialogTitle><DialogDescription>Ce produit sera ajoute a votre inventaire</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Nom du produit</Label>
              <Input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Pistaches, Gateau au chocolat..." className="bg-muted/50 border-0" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Type</Label>
                <Select value={newProduct.type} onValueChange={(v) => setNewProduct(p => ({ ...p, type: v as "mp" | "pf" }))}>
                  <SelectTrigger className="bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="mp">Matiere Premiere</SelectItem><SelectItem value="pf">Produit Fini</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Unite</Label>
                <Select value={newProduct.unit} onValueChange={(v) => setNewProduct(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogramme</SelectItem><SelectItem value="g">Gramme</SelectItem>
                    <SelectItem value="L">Litre</SelectItem><SelectItem value="unites">Unites</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem><SelectItem value="boites">Boites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Quantite comptee</Label>
              <Input type="number" step="0.01" value={newProduct.physicalQty} onChange={(e) => setNewProduct(p => ({ ...p, physicalQty: e.target.value }))} placeholder="0" className="bg-muted/50 border-0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleAddProduct} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm corrections */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ecarts detectes
            </DialogTitle>
            <DialogDescription>
              {discrepancyItems.length} article(s) ont un ecart entre le stock theorique et le comptage physique.
              Voulez-vous ajuster le stock pour correspondre au comptage ?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Theorique</TableHead>
                  <TableHead className="text-right">Physique</TableHead>
                  <TableHead className="text-right">Ecart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancyItems.map(item => {
                  const d = getDiscrepancy(item)!
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{item.theoreticalQty} {item.unit}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{item.physicalQty} {item.unit}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={`text-xs ${d > 0 ? "bg-green-100 text-green-700 border-0" : "bg-red-100 text-red-700 border-0"}`}>
                          {d > 0 ? "+" : ""}{d.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleIgnoreDiscrepancies} className="flex-1 rounded-xl" disabled={saving}>
              Ignorer les ecarts
            </Button>
            <Button onClick={handleApplyCorrections} className="flex-1 rounded-xl bg-[#4A7C59] hover:bg-[#3d6a4b] text-white" disabled={saving}>
              <Check className="mr-2 h-4 w-4" />
              {saving ? "Correction..." : "Corriger le stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
