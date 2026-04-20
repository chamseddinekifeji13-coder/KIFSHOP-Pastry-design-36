"use client"

import { useState } from "react"
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Star,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { PriceHistoryEntry, BestPriceByProduct } from "@/lib/approvisionnement/actions"

interface BestPricesViewProps {
  bestPrices: BestPriceByProduct[]
  getHistoryForProduct: (rawMaterialName: string) => PriceHistoryEntry[]
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function PriceRow({
  product,
  getHistoryForProduct,
}: {
  product: BestPriceByProduct
  getHistoryForProduct: (name: string) => PriceHistoryEntry[]
}) {
  const [open, setOpen] = useState(false)
  const history = getHistoryForProduct(product.rawMaterialName)

  // Get unique suppliers for this product
  const supplierPrices = new Map<string, { name: string; bestPrice: number; lastPrice: number; count: number }>()
  history.forEach((entry) => {
    const existing = supplierPrices.get(entry.supplierId)
    const price = entry.unitPrice
    if (!existing) {
      supplierPrices.set(entry.supplierId, {
        name: entry.supplierName,
        bestPrice: price,
        lastPrice: price,
        count: 1,
      })
    } else {
      existing.bestPrice = Math.min(existing.bestPrice, price)
      existing.count++
    }
  })

  const sortedSuppliers = [...supplierPrices.entries()].sort((a, b) => a[1].bestPrice - b[1].bestPrice)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-muted/50 group">
          <TableCell>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-semibold">{product.rawMaterialName}</span>
                <span className="text-xs text-muted-foreground block">
                  {product.entriesCount} achat{product.entriesCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-secondary" />
              <span className="font-medium text-sm">{product.bestSupplierName}</span>
            </div>
          </TableCell>
          <TableCell className="text-right">
            <span className="font-bold text-primary">
              {product.bestPrice.toFixed(2)} TND
            </span>
            <span className="text-xs text-muted-foreground block">/{product.unit}</span>
          </TableCell>
          <TableCell className="text-right">
            <span className="font-medium">
              {product.avgPrice.toFixed(2)} TND
            </span>
            <span className="text-xs text-muted-foreground block">/{product.unit}</span>
          </TableCell>
          <TableCell className="text-right">
            <span className="font-medium">
              {product.lastPrice.toFixed(2)} TND
            </span>
            <span className="text-xs text-muted-foreground block">
              {product.lastSupplierName}
            </span>
          </TableCell>
          <TableCell className="text-right">
            {product.priceVariation > 0 ? (
              <Badge variant="destructive" className="text-xs">
                <ArrowUpRight className="mr-0.5 h-3 w-3" />
                +{product.priceVariation}%
              </Badge>
            ) : product.priceVariation < 0 ? (
              <Badge className="bg-primary text-primary-foreground text-xs">
                <ArrowDownRight className="mr-0.5 h-3 w-3" />
                {product.priceVariation}%
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Minus className="mr-0.5 h-3 w-3" />
                0%
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-right">
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground inline-block" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground inline-block" />
            )}
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-muted/30 border-y border-border px-6 py-4">
              {/* Supplier ranking */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Classement fournisseurs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sortedSuppliers.map(([supplierId, data], index) => (
                    <div
                      key={supplierId}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        index === 0
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          index === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium">{data.name}</span>
                      <span className="text-muted-foreground">
                        {data.bestPrice.toFixed(2)} TND/{product.unit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({data.count} achat{data.count > 1 ? "s" : ""})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Recent history mini-table */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Derniers achats
                </h4>
                <div className="overflow-x-auto rounded-md border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
                        <th className="px-3 py-2 text-right font-medium">Qte</th>
                        <th className="px-3 py-2 text-right font-medium">Prix unit.</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((entry) => (
                        <tr key={entry.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(entry.date)}
                            </div>
                          </td>
                          <td className="px-3 py-2">{entry.supplierName}</td>
                          <td className="px-3 py-2 text-right">
                            {entry.quantity} {entry.unit}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {entry.unitPrice.toFixed(2)} TND
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(entry.unitPrice * entry.quantity).toFixed(0)} TND
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function BestPricesView({ bestPrices, getHistoryForProduct }: BestPricesViewProps) {
  // KPIs
  const totalProducts = bestPrices.length
  const productsUp = bestPrices.filter((p) => p.priceVariation > 0).length
  const productsDown = bestPrices.filter((p) => p.priceVariation < 0).length
  const productsStable = bestPrices.filter((p) => p.priceVariation === 0).length

  return (
    <div className="space-y-4">
      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Produits suivis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{productsDown}</span>
            </div>
            <p className="text-xs text-muted-foreground">Prix en baisse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{productsUp}</span>
            </div>
            <p className="text-xs text-muted-foreground">Prix en hausse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{productsStable}</span>
            </div>
            <p className="text-xs text-muted-foreground">Prix stables</p>
          </CardContent>
        </Card>
      </div>

      {/* Best Prices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-secondary" />
            Meilleur prix par produit
          </CardTitle>
          <CardDescription>
            Classement des fournisseurs par meilleur prix unitaire. Cliquez sur une ligne pour voir le detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matiere premiere</TableHead>
                  <TableHead>Meilleur fournisseur</TableHead>
                  <TableHead className="text-right">Meilleur prix</TableHead>
                  <TableHead className="text-right">Prix moyen</TableHead>
                  <TableHead className="text-right">Dernier prix</TableHead>
                  <TableHead className="text-right">Tendance</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestPrices.map((product) => (
                  <PriceRow
                    key={product.rawMaterialName}
                    product={product}
                    getHistoryForProduct={getHistoryForProduct}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
