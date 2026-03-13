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
  onItemClick: (id: string, name: string, type: "finished", unit?: string) => void
  onEditClick?: (product: FinishedProduct) => void
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
    <TooltipProvider>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead className="text-right">Prix vente</TableHead>
                  <TableHead className="text-right">Coût revient</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const sellingPrice = product.sellingPrice ?? 0
                  const costPrice = product.costPrice ?? 0
                  const ingredientCost = product.ingredientCost ?? 0
                  const packagingCost = product.packagingCost ?? 0
                  const isLowStock = product.currentStock <= product.minStock

                  const margin = sellingPrice > 0 && costPrice > 0
                    ? ((sellingPrice - costPrice) / sellingPrice * 100)
                    : 0

                  return (
                <TableRow 
                  key={product.id}
                  onClick={() => onItemClick(product.id, product.name, "finished")}
                  className="cursor-pointer hover:bg-muted/50"
                >
                      <TableCell>
                        <span className="font-medium">{product.name || <span className="text-muted-foreground italic">Sans nom</span>}</span>
                      </TableCell>
                      <TableCell>
                        <span className={isLowStock ? "text-destructive font-semibold" : ""}>
                          {product.currentStock} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {sellingPrice.toLocaleString("fr-TN")} TND
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help inline-flex items-center gap-1">
                              {costPrice.toLocaleString("fr-TN")} TND
                              {packagingCost > 0 && (
                                <Package className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs space-y-1">
                            <p>MP / Ingrédients: {ingredientCost.toLocaleString("fr-TN")} TND</p>
                            <p>Emballage: {packagingCost.toLocaleString("fr-TN")} TND</p>
                            <p className="font-semibold border-t pt-1">
                              Total: {costPrice.toLocaleString("fr-TN")} TND
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        {margin > 0 ? (
                          <Badge
                            variant={margin >= 30 ? "default" : margin >= 15 ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="p-1" onClick={(e) => e.stopPropagation()}>
                        {onEditClick && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => onEditClick(product)}
                            aria-label={`Modifier ${product.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
