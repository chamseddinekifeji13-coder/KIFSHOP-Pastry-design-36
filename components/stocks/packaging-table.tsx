"use client"

import { Package, AlertTriangle, Pencil } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Packaging } from "@/lib/stocks/actions"

const typeLabels: Record<string, string> = {
  boite: "Boite",
  plateau: "Plateau",
  sachet: "Sachet",
  pot: "Pot",
  film: "Film alimentaire",
  papier: "Papier",
  ruban: "Ruban",
  etiquette: "Etiquette",
  autre: "Autre",
}

interface PackagingTableProps {
  items: Packaging[]
  onItemClick?: (id: string, name: string) => void
  onEditClick?: (id: string, name: string, unit?: string, currentStock?: number, minStock?: number, pricePerUnit?: number) => void
}

export function PackagingTable({ items, onItemClick, onEditClick }: PackagingTableProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Aucun emballage enregistre</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez vos boites, plateaux et emballages
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Seuil min.</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4A373]/10">
                        <Package className="h-4 w-4 text-[#D4A373]" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {typeLabels[item.type] || item.type}
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
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditClick?.(item.id, item.name, item.unit, item.currentStock, item.minStock, item.price)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
