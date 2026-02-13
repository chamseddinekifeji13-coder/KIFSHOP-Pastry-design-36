"use client"

import { MapPin, AlertTriangle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RawMaterial } from "@/lib/mock-data"

interface RawMaterialsTableProps {
  materials: RawMaterial[]
  onItemClick: (id: string, name: string) => void
}

export function RawMaterialsTable({ materials, onItemClick }: RawMaterialsTableProps) {
  const getStatusBadge = (status: RawMaterial["status"]) => {
    switch (status) {
      case "in-stock":
        return <Badge variant="default" className="bg-primary">En stock</Badge>
      case "critical":
        return <Badge variant="destructive">Critique</Badge>
      case "expiring":
        return <Badge className="bg-warning text-warning-foreground">Proche expiration</Badge>
      default:
        return null
    }
  }

  const getStockPercentage = (quantity: number, threshold: number) => {
    const maxStock = threshold * 3
    return Math.min((quantity / maxStock) * 100, 100)
  }

  const getProgressColor = (status: RawMaterial["status"]) => {
    switch (status) {
      case "critical":
        return "bg-destructive"
      case "expiring":
        return "bg-warning"
      default:
        return "bg-primary"
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead className="hidden md:table-cell">Localisation</TableHead>
                <TableHead className="hidden sm:table-cell">Niveau</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow
                  key={material.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onItemClick(material.id, material.name)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {material.status === "critical" && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {material.status === "expiring" && (
                        <Clock className="h-4 w-4 text-warning" />
                      )}
                      <span className="font-medium">{material.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={material.status === "critical" ? "text-destructive font-semibold" : ""}>
                      {material.quantity} {material.unit}
                    </span>
                    <span className="text-muted-foreground text-xs block">
                      Seuil: {material.safetyThreshold} {material.unit}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {material.location === "labo" ? "Labo" : "Réserve"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="w-24">
                      <Progress
                        value={getStockPercentage(material.quantity, material.safetyThreshold)}
                        className="h-2"
                        indicatorClassName={getProgressColor(material.status)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(material.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
