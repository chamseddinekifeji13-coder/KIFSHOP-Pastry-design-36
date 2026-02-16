"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { FinishedProduct } from "@/lib/stocks/actions"

interface FinishedProductsTableProps {
  products: FinishedProduct[]
  onItemClick: (id: string, name: string) => void
}

export function FinishedProductsTable({ products, onItemClick }: FinishedProductsTableProps) {
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
                <TableHead className="text-right">Prix revient</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onItemClick(product.id, product.name)}>
                  <TableCell><span className="font-medium">{product.name}</span></TableCell>
                  <TableCell>{product.currentStock} {product.unit}</TableCell>
                  <TableCell className="text-right font-medium">{product.sellingPrice.toLocaleString("fr-TN")} TND</TableCell>
                  <TableCell className="text-right text-muted-foreground">{product.costPrice.toLocaleString("fr-TN")} TND</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
