"use client"

import { useState, useEffect } from "react"
import { Calculator, TrendingUp, Package, FlaskConical, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateRecipeCost, type RecipeCostBreakdown } from "@/lib/production/recipe-cost"

interface RecipeCostPanelProps {
  recipeId: string
  defaultQuantity?: number
  compact?: boolean
}

export function RecipeCostPanel({ recipeId, defaultQuantity = 1, compact = false }: RecipeCostPanelProps) {
  const [quantity, setQuantity] = useState(defaultQuantity)
  const [cost, setCost] = useState<RecipeCostBreakdown | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!recipeId) return
    setLoading(true)
    calculateRecipeCost(recipeId, quantity)
      .then(setCost)
      .finally(() => setLoading(false))
  }, [recipeId, quantity])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Calcul du cout...</span>
      </div>
    )
  }

  if (!cost) return null

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Calculator className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">Cout:</span>
        <span className="font-semibold">{cost.costPerUnit.toFixed(3)} TND</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{cost.yieldUnit}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          Vente {cost.suggestedPrice40.toFixed(3)} TND (+40%)
        </Badge>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            Cout de revient
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Quantite:</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-background border rounded-lg text-center"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Cost breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground mb-1">
              <FlaskConical className="h-3 w-3" /> Ingredients
            </div>
            <p className="text-sm font-bold">{cost.ingredientCost.toFixed(3)} TND</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground mb-1">
              <Package className="h-3 w-3" /> Emballages
            </div>
            <p className="text-sm font-bold">{cost.packagingCost.toFixed(3)} TND</p>
          </div>
        </div>

        {/* Total */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Cout total ({cost.totalUnits} {cost.yieldUnit})</p>
              <p className="text-lg font-bold text-primary">{cost.totalCost.toFixed(3)} TND</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Cout unitaire</p>
              <p className="text-lg font-bold">{cost.costPerUnit.toFixed(3)} TND</p>
            </div>
          </div>
        </div>

        {/* Margin suggestions */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <TrendingUp className="h-3 w-3" /> Prix de vente suggeres
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "+30%", value: cost.suggestedPrice30 },
              { label: "+40%", value: cost.suggestedPrice40 },
              { label: "+50%", value: cost.suggestedPrice50 },
            ].map((margin) => (
              <div key={margin.label} className="rounded-lg border p-2 text-center">
                <Badge variant="outline" className="text-[10px] mb-1">{margin.label}</Badge>
                <p className="text-sm font-semibold">{margin.value.toFixed(3)} TND</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredient detail */}
        {cost.ingredients.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detail ingredients</p>
            <div className="rounded-lg border divide-y text-xs">
              {cost.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{ing.name}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{ing.quantity} {ing.unit}</span>
                    <span>x {ing.pricePerUnit.toFixed(3)}</span>
                    <span className="font-semibold text-foreground">{ing.lineCost.toFixed(3)} TND</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
