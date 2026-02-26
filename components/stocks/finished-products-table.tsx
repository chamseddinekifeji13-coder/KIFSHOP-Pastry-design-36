"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Package, Pencil } from "lucide-react"
import type { FinishedProduct } from "@/lib/stocks/actions"

interface FinishedProductsTableProps {
  products: FinishedProduct[]
  onItemClick: (id: string, name: string) => void
  onEditClick?: (id: string, name: string, unit?: string, currentStock?: number, minStock?: number, pricePerUnit?: number) => void
}

export function FinishedProductsTable({ products, onItemClick, onEditClick }: FinishedProductsTableProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm font-medium">Aucun produit fini</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez vos produits via le bouton Nouveau produit fini</p>
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
                <TableHead>Produit</TableHead>
                <TableHead>Quantite</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Cout revient</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const margin = product.sellingPrice > 0 && product.costPrice > 0
                  ? ((product.sellingPrice - product.costPrice) / product.sellingPrice * 100)
                  : 0
                return (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onItemClick(product.id, product.name)}>
                    <TableCell><span className="font-medium">{product.name}</span></TableCell>
                    <TableCell>
                      <span className={product.currentStock <= product.minStock ? "text-red-600 font-semibold" : ""}>
                        {product.currentStock} {product.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{product.sellingPrice.toLocaleString("fr-TN")} TND</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help inline-flex items-center gap-1">
                              {product.costPrice.toLocaleString("fr-TN")} TND
                              {product.packagingCost > 0 && <Package className="h-3 w-3 text-muted-foreground/60" />}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs space-y-1">
                            <p>MP / Ingredients: {product.ingredientCost.toLocaleString("fr-TN")} TND</p>
                            <p>Emballage: {product.packagingCost.toLocaleString("fr-TN")} TND</p>
                            <p className="font-semibold border-t pt-1">Total: {product.costPrice.toLocaleString("fr-TN")} TND</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      {margin > 0 ? (
                        <Badge variant="secondary" className={`text-[10px] ${margin >= 30 ? "bg-emerald-100 text-emerald-700" : margin >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {margin.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditClick?.(product.id, product.name, product.unit, product.currentStock, product.minStock, product.sellingPrice)
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
        </div>
      </CardContent>
    </Card>
  )
}
