"use client"

import { useState } from "react"
import { Package, AlertTriangle, Edit2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONSUMABLE_CATEGORIES, type Consumable } from "@/lib/stocks/actions"
import { updateConsumable } from "@/lib/stocks/actions"
import { toast } from "sonner"

interface ConsumablesTableProps {
  items: Consumable[]
  onItemClick?: (id: string, name: string) => void
}

export function ConsumablesTable({ items, onItemClick }: ConsumablesTableProps) {
  const [editingItem, setEditingItem] = useState<Consumable | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editMinStock, setEditMinStock] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleEditClick = (item: Consumable) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditPrice(String(item.price || ""))
    setEditMinStock(String(item.minStock || ""))
    setEditUnit(item.unit || "unite")
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return
    setIsSaving(true)
    try {
      await updateConsumable(editingItem.id, {
        name: editName.trim(),
        price: Number(editPrice),
        minStock: Number(editMinStock) || 0,
        unit: editUnit,
      })
      toast.success("Consommable modifie avec succes")
      setEditingItem(null)
    } catch {
      toast.error("Erreur lors de la modification")
    } finally {
      setIsSaving(false)
    }
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Aucun consommable enregistre</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez vos produits de nettoyage, fournitures, etc.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Seuil min.</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isLow = item.currentStock <= item.minStock
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onItemClick?.(item.id, item.name)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleEditClick(item) }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {CONSUMABLE_CATEGORIES[item.category] || item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.currentStock} {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {item.minStock} {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.price.toFixed(3)} TND
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.supplier || "-"}
                  </TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Stock bas
                      </Badge>
                    ) : (
                      <Badge className="bg-[#4A7C59]/10 text-[#4A7C59] hover:bg-[#4A7C59]/20 border-0">
                        OK
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le consommable</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix unitaire (TND) *</Label>
              <Input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Seuil minimum</Label>
              <Input type="number" min="0" value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Unite</Label>
            <Select value={editUnit} onValueChange={setEditUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unite">unite</SelectItem>
                <SelectItem value="pcs">pcs</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="rouleau">rouleau</SelectItem>
                <SelectItem value="boite">boite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingItem(null)}>Annuler</Button>
          <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "Enregistrement..." : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
