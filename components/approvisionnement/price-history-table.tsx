"use client"

import { useState, useMemo } from "react"
import { ArrowUpRight, ArrowDownRight, Minus, Search, Calendar, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
interface PriceHistoryEntry {
  id: string; date: string; supplierId: string; supplierName: string
  rawMaterial: string; price: number; unit: string; quantity: number
}

interface PriceHistoryTableProps {
  entries: PriceHistoryEntry[]
  suppliers: { id: string; name: string }[]
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function PriceHistoryTable({ entries, suppliers }: PriceHistoryTableProps) {
  const [search, setSearch] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")

  const products = useMemo(() => {
    const unique = [...new Set(entries.map((e) => e.rawMaterialName))]
    return unique.sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        search === "" ||
        entry.rawMaterialName.toLowerCase().includes(search.toLowerCase()) ||
        entry.supplierName.toLowerCase().includes(search.toLowerCase())
      const matchesSupplier = supplierFilter === "all" || entry.supplierId === supplierFilter
      const matchesProduct = productFilter === "all" || entry.rawMaterialName === productFilter
      return matchesSearch && matchesSupplier && matchesProduct
    })
  }, [entries, search, supplierFilter, productFilter])

  // Compute price change compared to previous entry for same product & supplier
  const getVariation = (entry: PriceHistoryEntry) => {
    const sameProductSupplier = entries
      .filter(
        (e) =>
          e.rawMaterialName === entry.rawMaterialName &&
          e.supplierId === entry.supplierId &&
          new Date(e.date).getTime() < new Date(entry.date).getTime()
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (sameProductSupplier.length === 0) return null
    const prev = sameProductSupplier[0]
    return ((entry.unitPrice - prev.unitPrice) / prev.unitPrice) * 100
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique des prix d{"'"}achat</CardTitle>
        <CardDescription>
          Tous les prix enregistres lors des commandes fournisseurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher produit ou fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Produit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les produits</SelectItem>
              {products.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Fournisseur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fournisseurs</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filtered.length} enregistrement{filtered.length > 1 ? "s" : ""}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Matiere premiere</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Quantite</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Variation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun enregistrement trouve
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => {
                  const variation = getVariation(entry)
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(entry.date)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{entry.rawMaterialName}</TableCell>
                      <TableCell>
                        <span className="text-sm">{entry.supplierName}</span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {entry.quantity} {entry.unit}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {entry.unitPrice.toFixed(2)} TND/{entry.unit}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {(entry.unitPrice * entry.quantity).toFixed(0)} TND
                      </TableCell>
                      <TableCell className="text-right">
                        {variation === null ? (
                          <Badge variant="outline" className="text-xs">
                            <Minus className="mr-1 h-3 w-3" />
                            1er achat
                          </Badge>
                        ) : variation > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            <ArrowUpRight className="mr-1 h-3 w-3" />
                            +{variation.toFixed(1)}%
                          </Badge>
                        ) : variation < 0 ? (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            <ArrowDownRight className="mr-1 h-3 w-3" />
                            {variation.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Minus className="mr-1 h-3 w-3" />
                            0%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
