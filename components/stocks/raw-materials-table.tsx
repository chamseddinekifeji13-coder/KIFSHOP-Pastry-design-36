"use client"

import { useState } from "react"
import { AlertTriangle, FlaskConical, Plus, MapPin, Filter, Edit2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RawMaterial, StorageLocation } from "@/lib/stocks/actions"
import { updateRawMaterial } from "@/lib/stocks/actions"
import { toast } from "sonner"

interface RawMaterialsTableProps {
  materials: RawMaterial[]
  storageLocations?: StorageLocation[]
  onItemClick: (id: string, name: string, unit?: string) => void
  onAdd?: () => void
}

export function RawMaterialsTable({ materials, storageLocations, onItemClick, onAdd }: RawMaterialsTableProps) {
  const [locationFilter, setLocationFilter] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const locMap = new Map((storageLocations || []).map(l => [l.id, l]))

  const filtered = locationFilter === "all"
    ? materials
    : locationFilter === "unassigned"
      ? materials.filter(m => !m.storageLocationId)
      : materials.filter(m => m.storageLocationId === locationFilter)
  const handleEditClick = (material: RawMaterial) => {
    setEditingId(material.id)
    setEditName(material.name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    setIsSaving(true)
    try {
      await updateRawMaterial(editingId, { name: editName.trim() })
      toast.success("Matiere premiere modifiee")
      setEditingId(null)
    } catch (err: any) {
      toast.error("Erreur lors de la modification")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatus = (m: RawMaterial) => {
    if (m.minStock > 0 && m.currentStock <= m.minStock) return "critical"
    return "in-stock"
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <FlaskConical className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Aucune matiere premiere</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez vos ingredients : farine, sucre, beurre, oeufs...</p>
          {onAdd && (
            <Button className="mt-4 bg-[#4A7C59] hover:bg-[#3d6a4b] text-white" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une matiere premiere
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const hasLocations = (storageLocations || []).length > 0

  return (
    <Card>
      {hasLocations && (
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Emplacement:</span>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous ({materials.length})</SelectItem>
              <SelectItem value="unassigned">Non assigne ({materials.filter(m => !m.storageLocationId).length})</SelectItem>
              {(storageLocations || []).filter(l => l.isActive).map(loc => {
                const count = materials.filter(m => m.storageLocationId === loc.id).length
                return <SelectItem key={loc.id} value={loc.id}>{loc.name} ({count})</SelectItem>
              })}
            </SelectContent>
          </Select>
          {locationFilter !== "all" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setLocationFilter("all")}>Effacer</Button>
          )}
        </div>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                {hasLocations && <TableHead className="hidden md:table-cell">Emplacement</TableHead>}
                <TableHead>Quantite</TableHead>
                <TableHead className="hidden sm:table-cell">Niveau</TableHead>
                <TableHead>Prix/Unite</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((material) => {
                const status = getStatus(material)
                const maxStock = Math.max(material.minStock * 3, material.currentStock)
                const pct = maxStock > 0 ? Math.min((material.currentStock / maxStock) * 100, 100) : 0
                const loc = material.storageLocationId ? locMap.get(material.storageLocationId) : null
                return (
                  <TableRow key={material.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onItemClick(material.id, material.name, material.unit)}>
                <TableCell>
                  <span className="font-medium">{material.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-5 w-5 p-0 inline-flex"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditClick(material)
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </TableCell>
                    {hasLocations && (
                      <TableCell className="hidden md:table-cell">
                        {loc ? (
                          <Badge variant="outline" className="text-xs gap-1 font-normal">
                            <MapPin className="h-3 w-3" />
                            {loc.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={status === "critical" ? "text-destructive font-semibold" : ""}>
                        {material.currentStock} {material.unit}
                      </span>
                      {material.minStock > 0 && (
                        <span className="text-muted-foreground text-xs block">Seuil: {material.minStock} {material.unit}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="w-24">
                        <Progress value={pct} className="h-2" indicatorClassName={status === "critical" ? "bg-destructive" : "bg-primary"} />
                      </div>
                    </TableCell>
                    <TableCell>{material.pricePerUnit.toLocaleString("fr-TN")} TND</TableCell>
                    <TableCell>
                      {status === "critical" ? <Badge variant="destructive">Critique</Badge> : <Badge variant="default" className="bg-primary">En stock</Badge>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Dialog open={!!editingId} onOpenChange={() => editingId && setEditingId(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le nom</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nouveau nom</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Entrez le nouveau nom"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
          <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "Saving..." : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
