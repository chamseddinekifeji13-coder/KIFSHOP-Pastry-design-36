"use client"

import { useState, useCallback, useEffect } from "react"
import { Truck, Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createDeliveryNote, type Supplier, type PurchaseOrder } from "@/lib/approvisionnement/actions"
import type { RawMaterial, Packaging, Consumable } from "@/lib/stocks/actions"

interface DeliveryItemRow {
  itemType: "raw_material" | "packaging" | "consumable"
  itemId: string
  name: string
  quantityOrdered: string
  quantityReceived: string
  unit: string
  isConform: boolean
  remark: string
}

const emptyItem: DeliveryItemRow = {
  itemType: "raw_material", itemId: "", name: "", quantityOrdered: "", quantityReceived: "", unit: "kg", isConform: true, remark: "",
}

interface NewDeliveryNoteDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  rawMaterials: RawMaterial[]
  packaging: Packaging[]
  consumables: Consumable[]
  onSuccess?: () => void
}

export function NewDeliveryNoteDrawer({ open, onOpenChange, suppliers, purchaseOrders, rawMaterials, packaging, consumables, onSuccess }: NewDeliveryNoteDrawerProps) {
  const { currentTenant } = useTenant()
  const [saving, setSaving] = useState(false)
  const [deliveryNumber, setDeliveryNumber] = useState("")
  const [purchaseOrderId, setPurchaseOrderId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<DeliveryItemRow[]>([{ ...emptyItem }])

  // Pending POs only
  const pendingOrders = purchaseOrders.filter((o) => o.status !== "livree" && o.status !== "annulee")

  function resetForm() {
    setDeliveryNumber(""); setPurchaseOrderId(""); setSupplierId(""); setSupplierName("")
    setDeliveryDate(new Date().toISOString().split("T")[0]); setNotes("")
    setItems([{ ...emptyItem }])
  }

  // Auto-fill items from selected PO
  useEffect(() => {
    if (!purchaseOrderId) return
    const po = purchaseOrders.find((o) => o.id === purchaseOrderId)
    if (!po) return
    setSupplierId(po.supplierId || "")
    setSupplierName(po.supplierName)
    // Pre-fill items from PO items
    const newItems: DeliveryItemRow[] = po.items.map((i) => ({
      itemType: "raw_material" as const,
      itemId: "",
      name: i.name,
      quantityOrdered: String(i.quantity),
      quantityReceived: String(i.quantity),
      unit: i.unit,
      isConform: true,
      remark: "",
    }))
    if (newItems.length > 0) setItems(newItems)
  }, [purchaseOrderId, purchaseOrders])

  const handleSupplierChange = useCallback((value: string) => {
    setSupplierId(value)
    const supplier = suppliers.find((s) => s.id === value)
    if (supplier) setSupplierName(supplier.name)
  }, [suppliers])

  const updateItem = useCallback((index: number, field: keyof DeliveryItemRow, value: string | boolean) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }, [])

  const handleItemSelect = useCallback((index: number, itemType: string, itemId: string) => {
    setItems((prev) => {
      const next = [...prev]
      let name = ""
      let unit = "kg"
      if (itemType === "raw_material") {
        const rm = rawMaterials.find((r) => r.id === itemId)
        if (rm) { name = rm.name; unit = rm.unit }
      } else if (itemType === "packaging") {
        const pkg = packaging.find((p) => p.id === itemId)
        if (pkg) { name = pkg.name; unit = pkg.unit }
      } else if (itemType === "consumable") {
        const cons = consumables.find((c) => c.id === itemId)
        if (cons) { name = cons.name; unit = cons.unit }
      }
      next[index] = { ...next[index], itemType: itemType as DeliveryItemRow["itemType"], itemId, name, unit }
      return next
    })
  }, [rawMaterials, packaging, consumables])

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { ...emptyItem }])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }, [])

  const getItemOptions = (type: string) => {
    if (type === "raw_material") return rawMaterials.map((r) => ({ id: r.id, name: r.name }))
    if (type === "packaging") return packaging.map((p) => ({ id: p.id, name: p.name }))
    if (type === "consumable") return consumables.map((c) => ({ id: c.id, name: c.name }))
    return []
  }

  const nonConformCount = items.filter((i) => !i.isConform).length
  const totalOrdered = items.reduce((sum, i) => sum + (Number(i.quantityOrdered) || 0), 0)
  const totalReceived = items.reduce((sum, i) => sum + (Number(i.quantityReceived) || 0), 0)

  async function handleSubmit() {
    if (!deliveryNumber.trim()) { toast.error("Le numero du bon est obligatoire"); return }
    if (!supplierName.trim()) { toast.error("Le fournisseur est obligatoire"); return }
    const validItems = items.filter((i) => i.name.trim() && Number(i.quantityReceived) >= 0)
    if (validItems.length === 0) { toast.error("Ajoutez au moins un article"); return }

    setSaving(true)
    try {
      const result = await createDeliveryNote(currentTenant.id, {
        deliveryNumber: deliveryNumber.trim(),
        purchaseOrderId: purchaseOrderId || undefined,
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        deliveryDate,
        notes: notes.trim() || undefined,
        items: validItems.map((i) => ({
          itemType: i.itemType,
          rawMaterialId: i.itemType === "raw_material" ? i.itemId || undefined : undefined,
          packagingId: i.itemType === "packaging" ? i.itemId || undefined : undefined,
          consumableId: i.itemType === "consumable" ? i.itemId || undefined : undefined,
          name: i.name, quantityOrdered: Number(i.quantityOrdered) || 0,
          quantityReceived: Number(i.quantityReceived) || 0, unit: i.unit,
          isConform: i.isConform, remark: i.remark.trim() || undefined,
        })),
      })
      if (result) {
        toast.success("Bon de livraison cree", { description: `BL ${deliveryNumber} en attente de validation` })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue"
      toast.error("Erreur", { description: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] p-0 flex flex-col gap-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#4A7C59] to-[#3d6849] p-6 text-white">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-white text-lg">Nouveau bon de livraison</SheetTitle>
                <p className="text-white/80 text-sm">Saisie des quantites recues du fournisseur</p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Delivery info */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#4A7C59]" />
              Informations livraison
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">N du bon *</Label>
                <Input placeholder="BL-001" value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date de livraison</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
            </div>

            {/* Link to purchase order */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Lier a un bon de commande (optionnel)</Label>
              <Select value={purchaseOrderId} onValueChange={setPurchaseOrderId}>
                <SelectTrigger><SelectValue placeholder="Aucun - saisie libre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun - saisie libre</SelectItem>
                  {pendingOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.supplierName} - {po.total.toFixed(3)} TND ({po.items.length} articles)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fournisseur *</Label>
              {purchaseOrderId && purchaseOrderId !== "none" ? (
                <Input value={supplierName} readOnly className="bg-muted" />
              ) : (
                <Select value={supplierId} onValueChange={handleSupplierChange}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {!supplierId && (!purchaseOrderId || purchaseOrderId === "none") && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ou saisir le nom du fournisseur</Label>
                <Input placeholder="Nom du fournisseur" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#4A7C59]/10 text-[#4A7C59] text-xs font-bold">{items.length}</span>
                Articles recus
              </h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className={`rounded-lg border p-3 space-y-3 ${!item.isConform ? "border-amber-300 bg-amber-50/50" : "bg-muted/30"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Article {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id={`conform-${idx}`}
                          checked={item.isConform}
                          onCheckedChange={(c) => updateItem(idx, "isConform", !!c)}
                        />
                        <Label htmlFor={`conform-${idx}`} className="text-[10px] text-muted-foreground cursor-pointer">Conforme</Label>
                      </div>
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {(!purchaseOrderId || purchaseOrderId === "none") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Type</Label>
                        <Select value={item.itemType} onValueChange={(v) => { updateItem(idx, "itemType", v); updateItem(idx, "itemId", ""); updateItem(idx, "name", "") }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="raw_material">Matiere premiere</SelectItem>
                            <SelectItem value="packaging">Emballage</SelectItem>
                            <SelectItem value="consumable">Consommable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Article</Label>
                        <Select value={item.itemId} onValueChange={(v) => handleItemSelect(idx, item.itemType, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                          <SelectContent>
                            {getItemOptions(item.itemType).map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {(!purchaseOrderId || purchaseOrderId === "none") && !item.itemId && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Ou saisir le nom</Label>
                      <Input className="h-8 text-xs" placeholder="Nom de l'article" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} />
                    </div>
                  )}

                  {purchaseOrderId && purchaseOrderId !== "none" && (
                    <div className="text-xs font-medium">{item.name}</div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Qte commandee</Label>
                      <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0" value={item.quantityOrdered} onChange={(e) => updateItem(idx, "quantityOrdered", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Qte recue</Label>
                      <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0" value={item.quantityReceived} onChange={(e) => updateItem(idx, "quantityReceived", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Unite</Label>
                      <Input className="h-8 text-xs" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                    </div>
                  </div>

                  {!item.isConform && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-amber-700 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />Remarque de non-conformite
                      </Label>
                      <Input className="h-8 text-xs border-amber-300" placeholder="Decrivez le probleme..." value={item.remark} onChange={(e) => updateItem(idx, "remark", e.target.value)} />
                    </div>
                  )}

                  {Number(item.quantityReceived) > 0 && Number(item.quantityOrdered) > 0 && Number(item.quantityReceived) !== Number(item.quantityOrdered) && (
                    <div className="text-[10px] text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Ecart: {(Number(item.quantityReceived) - Number(item.quantityOrdered)).toFixed(2)} {item.unit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
            <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
            <Textarea placeholder="Remarques sur la livraison..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Summary */}
          <div className="rounded-xl border bg-[#4A7C59]/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total commande</span>
              <span className="font-mono font-medium">{totalOrdered.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total recu</span>
              <span className="font-mono font-medium">{totalReceived.toFixed(2)}</span>
            </div>
            {nonConformCount > 0 && (
              <div className="flex justify-between text-sm text-amber-700 border-t pt-2">
                <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Non conformes</span>
                <span className="font-mono font-medium">{nonConformCount} article{nonConformCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1 bg-[#4A7C59] hover:bg-[#3d6849] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
            {saving ? "Enregistrement..." : "Soumettre le BL"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
