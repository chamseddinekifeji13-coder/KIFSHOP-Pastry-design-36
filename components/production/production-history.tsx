"use client"

import { useState } from "react"
import { History, Loader2, ChefHat, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useTenant } from "@/lib/tenant-context"
import useSWR from "swr"
import { fetchProductionRunsWithRecipes, type ProductionRunWithRecipe } from "@/lib/production/actions"

export function ProductionHistory() {
  const { currentTenant } = useTenant()
  const [search, setSearch] = useState("")

  const { data: runs = [], isLoading } = useSWR(
    currentTenant ? ["production-runs-history", currentTenant.id] : null,
    ([_, tenantId]) => fetchProductionRunsWithRecipes(tenantId),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const filteredRuns = runs.filter((r) =>
    !search || r.recipeName.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement de l{"'"}historique...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Historique de production</h2>
          <p className="text-sm text-muted-foreground">{runs.length} production(s) enregistree(s)</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par recette..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {filteredRuns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{search ? "Aucun resultat" : "Aucune production enregistree"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Essayez un autre terme de recherche" : "Les productions apparaitront ici apres execution"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border divide-y">
          {filteredRuns.map((run) => (
            <div key={run.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <ChefHat className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{run.recipeName}</p>
                    <p className="text-xs text-muted-foreground">
                      x{run.quantityMultiplier} - {new Date(run.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Badge variant={run.status === "completed" ? "default" : "secondary"} className="shrink-0">
                  {run.status === "completed" ? "Termine" : run.status}
                </Badge>
              </div>
              {(run.totalCost != null || run.costPerUnit != null) && (
                <div className="mt-2 ml-12 flex items-center gap-3 text-xs text-muted-foreground">
                  {run.totalCost != null && <span>Cout: {run.totalCost.toFixed(3)} TND</span>}
                  {run.costPerUnit != null && <span>({run.costPerUnit.toFixed(3)} TND/u)</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
