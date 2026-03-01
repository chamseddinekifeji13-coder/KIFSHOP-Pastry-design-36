"use client"

import { useState, useCallback } from "react"
import { FileText, Loader2, Plus, Trash2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { createPurchaseInvoice, type Supplier } from "@/lib/approvisionnement/actions"
import type { RawMaterial, Packaging, Consumable } from "@/lib/stocks/actions"

interface InvoiceItemRow {
  itemType: "raw_material" | "packaging" | "consumable"
  itemId: string
  name: string
  quantity: string
  unit: string
  unitPrice: string
  tvaRate: string
}

const emptyItem: InvoiceItemRow = {
  itemType: "raw_material", itemId: "", name: "", quantity: "", unit: "kg", unitPrice: "", tvaRate: "7",
}

interface NewInvoiceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: Supplier[]
  rawMaterials: RawMaterial[]
  packaging: Packaging[]
  consumables: Consumable[]
  onSuccess?: () => void
}

export function NewInvoiceDrawer({ open, onOpenChange, suppliers, rawMaterials, packaging, consumables, onSuccess }: NewInvoiceDrawerProps) {
  const { currentTenant } = useTenant()
  const [saving, setSaving] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<InvoiceItemRow[]>([{ ...emptyItem }])

  function resetForm() {
    setInvoiceNumber(""); setSupplierId(""); setSupplierName("")
    setInvoiceDate(new Date().toISOString().split("T")[0]); setDueDate(""); setNotes("")
    setItems([{ ...emptyItem }])
  }

  const handleSupplierChange = useCallback((value: string) => {
    setSupplierId(value)
    const supplier = suppliers.find((s) => s.id === value)
    if (supplier) setSupplierName(supplier.name)
  }, [suppliers])

  const updateItem = useCallback((index: number, field: keyof InvoiceItemRow, value: string) => {
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
      let unitPrice = ""
      if (itemType === "raw_material") {
        const rm = rawMaterials.find((r) => r.id === itemId)
        if (rm) { name = rm.name; unit = rm.unit; unitPrice = String(rm.pricePerUnit) }
      } else if (itemType === "packaging") {
        const pkg = packaging.find((p) => p.id === itemId)
        if (pkg) { name = pkg.name; unit = pkg.unit; unitPrice = String(pkg.price) }
      } else if (itemType === "consumable") {
        const cons = consumables.find((c) => c.id === itemId)
        if (cons) { name = cons.name; unit = cons.unit; unitPrice = String(cons.price) }
      }
      next[index] = { ...next[index], itemType: itemType as InvoiceItemRow["itemType"], itemId, name, unit, unitPrice }
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

  const totalHt = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
  const totalTtc = items.reduce((sum, i) => {
    const ht = (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)
    return sum + ht * (1 + (Number(i.tvaRate) || 0) / 100)
  }, 0)

  async function handleSubmit() {
    if (!invoiceNumber.trim()) { toast.error("Le numero de facture est obligatoire"); return }
    if (!supplierName.trim()) { toast.error("Le fournisseur est obligatoire"); return }
    const validItems = items.filter((i) => i.name.trim() && Number(i.quantity) > 0 && Number(i.unitPrice) > 0)
    if (validItems.length === 0) { toast.error("Ajoutez au moins un article valide"); return }

    setSaving(true)
    try {
      const result = await createPurchaseInvoice(currentTenant.id, {
        invoiceNumber: invoiceNumber.trim(),
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        invoiceDate,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        items: validItems.map((i) => ({
          itemType: i.itemType,
          rawMaterialId: i.itemType === "raw_material" ? i.itemId : undefined,
          packagingId: i.itemType === "packaging" ? i.itemId : undefined,
          consumableId: i.itemType === "consumable" ? i.itemId : undefined,
          name: i.name, quantity: Number(i.quantity), unit: i.unit,
          unitPrice: Number(i.unitPrice), tvaRate: Number(i.tvaRate) || 0,
        })),
      })
      if (result) {
        toast.success("Facture creee", { description: `Facture ${invoiceNumber} en attente de validation` })
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
        <div className="bg-gradient-to-br from-[#D4A373] to-[#c4956a] p-6 text-white">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-white text-lg">Nouvelle facture d{"'"}achat</SheetTitle>
                <p className="text-white/80 text-sm">Saisie pour validation par le magasin</p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Invoice info */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#D4A373]" />
              Informations facture
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">N de facture *</Label>
                <Input placeholder="FAC-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fournisseur *</Label>
                <Select value={supplierId} onValueChange={handleSupplierChange}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!supplierId && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ou saisir le nom du fournisseur</Label>
                <Input placeholder="Nom du fournisseur" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date facture</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date echeance</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#4A7C59]/10 text-[#4A7C59] text-xs font-bold">{items.length}</span>
                Articles
              </h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Article {idx + 1}</span>
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

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

                  {!item.itemId && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Ou saisir le nom</Label>
                      <Input className="h-8 text-xs" placeholder="Nom de l'article" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Quantite</Label>
                      <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Unite</Label>
                      <Input className="h-8 text-xs" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">P.U. (TND)</Label>
                      <Input className="h-8 text-xs" type="number" min="0" step="0.001" placeholder="0.000" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">TVA %</Label>
                      <Select value={item.tvaRate} onValueChange={(v) => updateItem(idx, "tvaRate", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="7">7%</SelectItem>
                          <SelectItem value="13">13%</SelectItem>
                          <SelectItem value="19">19%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    HT: {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(3)} TND
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
            <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
            <Textarea placeholder="Remarques sur la facture..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Totals */}
          <div className="rounded-xl border bg-[#D4A373]/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-mono font-medium">{totalHt.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-mono font-medium">{(totalTtc - totalHt).toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Total TTC</span>
              <span className="font-mono">{totalTtc.toFixed(3)} TND</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1 bg-[#D4A373] hover:bg-[#c4956a] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {saving ? "Enregistrement..." : "Soumettre la facture"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
