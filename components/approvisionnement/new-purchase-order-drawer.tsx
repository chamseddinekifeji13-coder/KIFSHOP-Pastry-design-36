"use client"

import { useState } from "react"
import { Plus, Trash2, CalendarIcon, ShoppingCart, Package, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { Supplier, PurchaseOrder } from "@/lib/mock-data"

interface OrderItem {
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

interface NewPurchaseOrderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: Supplier[]
  onOrderCreated: (order: PurchaseOrder) => void
  tenantId: string
}

const UNITS = ["kg", "g", "L", "ml", "piece", "carton", "sac", "boite"]

export function NewPurchaseOrderDrawer({
  open,
  onOpenChange,
  suppliers,
  onOrderCreated,
  tenantId,
}: NewPurchaseOrderDrawerProps) {
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [expectedDelivery, setExpectedDelivery] = useState("")
  const [items, setItems] = useState<OrderItem[]>([
    { name: "", quantity: 1, unit: "kg", unitPrice: 0 },
  ])
  const [saving, setSaving] = useState(false)

  const activeSuppliers = suppliers.filter((s) => s.status === "actif")
  const selectedSupplier = suppliers.find((s) => s.id === supplierId)

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  function addItem() {
    setItems([...items, { name: "", quantity: 1, unit: "kg", unitPrice: 0 }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    const updated = [...items]
    if (field === "quantity" || field === "unitPrice") {
      updated[index][field] = Number(value) || 0
    } else {
      updated[index][field] = value as string
    }
    setItems(updated)
  }

  function resetForm() {
    setSupplierId("")
    setSupplierName("")
    setExpectedDelivery("")
    setItems([{ name: "", quantity: 1, unit: "kg", unitPrice: 0 }])
  }

  async function handleSubmit() {
    const resolvedName = selectedSupplier?.name || supplierName.trim()
    if (!supplierId && !resolvedName) {
      toast.error("Indiquez un fournisseur")
      return
    }

    const validItems = items.filter((item) => item.name.trim() && item.quantity > 0)
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins un article avec un nom et une quantite")
      return
    }

    setSaving(true)

    const finalSupplierName = selectedSupplier?.name || supplierName.trim()
    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      tenantId,
      supplierId: supplierId || `manual-${Date.now()}`,
      supplierName: finalSupplierName,
      items: validItems,
      total: validItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      status: "brouillon",
      createdAt: new Date().toISOString(),
      expectedDelivery: expectedDelivery || undefined,
    }

    try {
      onOrderCreated(newOrder)
      toast.success("Commande d'achat creee", {
        description: `${newOrder.id.toUpperCase()} - ${finalSupplierName}`,
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-secondary to-secondary/80 px-6 py-8 text-secondary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouvelle commande d{"'"}achat</h2>
              <p className="text-sm opacity-70">Creez une commande pour un fournisseur</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Supplier Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Fournisseur
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fournisseur *</Label>
                {activeSuppliers.length > 0 ? (
                  <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setSupplierName("") }}>
                    <SelectTrigger className="bg-muted/50 border-0">
                      <SelectValue placeholder="Selectionnez un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Nom du fournisseur"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Livraison prevue</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                Articles
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-lg h-7 text-xs">
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      Article {index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <Input
                    placeholder="Nom de l'article (ex: Farine, Sucre...)"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] font-medium text-muted-foreground">Quantite</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-muted-foreground">Unite</Label>
                      <Select value={item.unit} onValueChange={(v) => updateItem(index, "unit", v)}>
                        <SelectTrigger className="bg-muted/50 border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-muted-foreground">Prix (TND)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>

                  {item.quantity > 0 && item.unitPrice > 0 && (
                    <div className="text-right">
                      <span className="text-xs font-medium text-primary">
                        {(item.quantity * item.unitPrice).toFixed(2)} TND
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total Card */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex items-center justify-between">
            <span className="font-medium text-sm">Total commande</span>
            <span className="text-xl font-bold text-primary">{total.toFixed(2)} TND</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creation..." : "Creer la commande"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
