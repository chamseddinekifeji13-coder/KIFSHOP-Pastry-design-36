"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { FinishedProduct } from "@/lib/mock-data"

interface FinishedProductsTableProps {
  products: FinishedProduct[]
  onItemClick: (id: string, name: string) => void
}

export function FinishedProductsTable({ products, onItemClick }: FinishedProductsTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onItemClick(product.id, product.name)}
                >
                  <TableCell>
                    <span className="font-medium">{product.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {product.quantity} {product.unit}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.price.toLocaleString("fr-TN")} TND
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
