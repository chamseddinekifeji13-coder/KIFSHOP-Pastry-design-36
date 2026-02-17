"use client"

import { AlertTriangle, FlaskConical, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RawMaterial } from "@/lib/stocks/actions"

interface RawMaterialsTableProps {
  materials: RawMaterial[]
  onItemClick: (id: string, name: string) => void
  onAdd?: () => void
}

export function RawMaterialsTable({ materials, onItemClick, onAdd }: RawMaterialsTableProps) {
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

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Quantite</TableHead>
                <TableHead className="hidden sm:table-cell">Niveau</TableHead>
                <TableHead>Prix/Unite</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => {
                const status = getStatus(material)
                const maxStock = Math.max(material.minStock * 3, material.currentStock)
                const pct = maxStock > 0 ? Math.min((material.currentStock / maxStock) * 100, 100) : 0
                return (
                  <TableRow key={material.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onItemClick(material.id, material.name)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {status === "critical" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        <span className="font-medium">{material.name}</span>
                      </div>
                    </TableCell>
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
  )
}
