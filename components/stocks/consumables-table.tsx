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
import { CONSUMABLE_CATEGORIES, type Consumable, updateConsumable } from "@/lib/stocks/actions"
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
    setEditUnit(item.unit || "unité")
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return
    
    const price = Number(editPrice)
    const minStock = Number(editMinStock)
    
    if (isNaN(price) || price < 0) {
      toast.error("Veuillez entrer un prix valide")
      return
    }
    
    setIsSaving(true)
    try {
      await updateConsumable(editingItem.id, {
        name: editName.trim(),
        price: price,
        minStock: minStock || 0,
        unit: editUnit,
      })
      toast.success("Consommable modifié avec succès")
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
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">Aucun consommable enregistré</p>
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
              <TableHead>Catégorie</TableHead>
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0"
                        onClick={(e) => { e.stopPropagation(); handleEditClick(item) }}
                        aria-label={`Modifier ${item.name}`}
                      >
                        <Edit2 className="h-3 w-3" aria-hidden="true" />
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
                    {(item.price ?? 0).toFixed(3)} TND
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.supplier || "-"}
                  </TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        Stock bas
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
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
            <Label htmlFor="edit-name">Nom *</Label>
            <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Prix unitaire (TND) *</Label>
              <Input id="edit-price" type="number" min="0" step="0.001" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-minstock">Seuil minimum</Label>
              <Input id="edit-minstock" type="number" min="0" value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-unit">Unité</Label>
            <select
              id="edit-unit"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
            >
              <option value="unité">unité</option>
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="rouleau">rouleau</option>
              <option value="boîte">boîte</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingItem(null)}>Annuler</Button>
          <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
