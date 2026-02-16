"use client"

import { useState } from "react"
import { Plus, Trash2, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
    setExpectedDelivery("")
    setItems([{ name: "", quantity: 1, unit: "kg", unitPrice: 0 }])
  }

  async function handleSubmit() {
    if (!supplierId) {
      toast.error("Selectionnez un fournisseur")
      return
    }

    const validItems = items.filter((item) => item.name.trim() && item.quantity > 0)
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins un article avec un nom et une quantite")
      return
    }

    setSaving(true)

    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      tenantId,
      supplierId,
      supplierName: selectedSupplier?.name || "",
      items: validItems,
      total: validItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      status: "brouillon",
      createdAt: new Date().toISOString(),
      expectedDelivery: expectedDelivery || undefined,
    }

    try {
      onOrderCreated(newOrder)
      toast.success("Commande d'achat creee", {
        description: `${newOrder.id.toUpperCase()} - ${selectedSupplier?.name}`,
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvelle commande d{"'"}achat</SheetTitle>
          <SheetDescription>
            Creez une commande pour un fournisseur
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label>Fournisseur *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionnez un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {activeSuppliers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Aucun fournisseur actif
                  </div>
                ) : (
                  activeSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Expected Delivery */}
          <div className="space-y-2">
            <Label>Livraison prevue</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className="pl-10"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Articles *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Article {index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
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
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Quantite</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unite</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateItem(index, "unit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Prix unit. (TND)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-right text-sm text-muted-foreground">
                  Sous-total: {(item.quantity * item.unitPrice).toFixed(2)} TND
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
            <span className="font-medium">Total commande</span>
            <span className="text-xl font-bold">{total.toFixed(2)} TND</span>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creation..." : "Creer la commande"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
