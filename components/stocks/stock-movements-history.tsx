"use client"

import { useState, useMemo } from "react"
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Search, X, Loader2, History, Package, Box, Gift, Filter, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStockMovements, useRawMaterials, useFinishedProducts, usePackaging } from "@/hooks/use-tenant-data"
import type { StockMovement } from "@/lib/stocks/actions"

const MOVEMENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: LucideIcon }> = {
  entry: { label: "Entrée", variant: "default", icon: ArrowDownToLine },
  exit: { label: "Sortie", variant: "destructive", icon: ArrowUpFromLine },
  transfer: { label: "Transfert", variant: "secondary", icon: ArrowLeftRight },
  adjustment: { label: "Ajustement", variant: "outline", icon: ArrowLeftRight },
  production_in: { label: "Production (entrée)", variant: "default", icon: ArrowDownToLine },
  production_out: { label: "Production (sortie)", variant: "destructive", icon: ArrowUpFromLine },
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  raw_material: "MP",
  finished_product: "PF",
  packaging: "Emb.",
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function StockMovementsHistory() {
  const { data: movements, isLoading } = useStockMovements(200)
  const { data: rawMaterials } = useRawMaterials()
  const { data: finishedProducts } = useFinishedProducts()
  const { data: packagingItems } = usePackaging()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterItemType, setFilterItemType] = useState<string>("all")

  // Build a name lookup map
  const nameMap = useMemo(() => {
    const map: Record<string, string> = {}
    ;(rawMaterials || []).forEach((m) => { map[m.id] = m.name })
    ;(finishedProducts || []).forEach((p) => { map[p.id] = p.name })
    ;(packagingItems || []).forEach((pk) => { map[pk.id] = pk.name })
    return map
  }, [rawMaterials, finishedProducts, packagingItems])

  const getItemName = (m: StockMovement & { packagingId?: string | null }) => {
    if (m.rawMaterialId && nameMap[m.rawMaterialId]) return nameMap[m.rawMaterialId]
    if (m.finishedProductId && nameMap[m.finishedProductId]) return nameMap[m.finishedProductId]
    if (m.packagingId && nameMap[m.packagingId]) return nameMap[m.packagingId]
    return m.reference || "Article inconnu"
  }

  const filtered = useMemo(() => {
    if (!movements) return []
    let result = [...movements]

    if (filterType !== "all") {
      result = result.filter((m) => m.movementType === filterType)
    }
    if (filterItemType !== "all") {
      result = result.filter((m) => m.itemType === filterItemType)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((m) => {
        const name = getItemName(m).toLowerCase()
        const reason = (m.reason || "").toLowerCase()
        const ref = (m.reference || "").toLowerCase()
        return name.includes(q) || reason.includes(q) || ref.includes(q)
      })
    }
    return result
  }, [movements, filterType, filterItemType, searchQuery, nameMap])

  const hasActiveFilters = filterType !== "all" || filterItemType !== "all" || searchQuery.trim() !== ""

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold">Aucun mouvement</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {"Les mouvements de stock (entrées, sorties, transferts) apparaîtront ici"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Rechercher article, motif, référence..."
            className="pl-9 pr-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Effacer</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" aria-hidden="true" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="entry">Entrées</SelectItem>
              <SelectItem value="exit">Sorties</SelectItem>
              <SelectItem value="transfer">Transferts</SelectItem>
              <SelectItem value="adjustment">Ajustements</SelectItem>
              <SelectItem value="production_in">Production (in)</SelectItem>
              <SelectItem value="production_out">Production (out)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterItemType} onValueChange={setFilterItemType}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Article" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="raw_material">Matières P.</SelectItem>
              <SelectItem value="finished_product">Produits F.</SelectItem>
              <SelectItem value="packaging">Emballages</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => { setFilterType("all"); setFilterItemType("all"); setSearchQuery("") }}
              aria-label="Réinitialiser les filtres"
            >
              <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} mouvement{filtered.length !== 1 ? "s" : ""}
        {hasActiveFilters ? " (filtre)" : ""}
      </p>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold w-[160px]">Date</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Article</TableHead>
                <TableHead className="text-xs font-semibold text-right">Quantité</TableHead>
                <TableHead className="text-xs font-semibold">Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                    Aucun mouvement ne correspond aux filtres
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => {
                  const moveMeta = MOVEMENT_LABELS[m.movementType] || { 
                    label: m.movementType, 
                    variant: "secondary" as const, 
                    icon: ArrowLeftRight 
                  }
                  const MoveIcon = moveMeta.icon
                  const itemLabel = ITEM_TYPE_LABELS[m.itemType] || m.itemType
                  const isEntry = m.movementType === "entry" || m.movementType === "production_in"

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={moveMeta.variant} className="gap-1 text-[10px] font-medium">
                          <MoveIcon className="h-3 w-3" aria-hidden="true" />
                          {moveMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {itemLabel}
                          </span>
                          <span className="text-sm font-medium">{getItemName(m)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-semibold tabular-nums ${isEntry ? "text-primary" : "text-destructive"}`}>
                          {isEntry ? "+" : "-"}{m.quantity} {m.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {m.reason || "-"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
