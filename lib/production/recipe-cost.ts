import { createClient } from "@/lib/supabase/client"

export interface RecipeCostBreakdown {
  recipeId: string
  recipeName: string
  yieldQuantity: number
  yieldUnit: string
  multiplier: number
  totalUnits: number
  ingredientCost: number
  packagingCost: number
  totalCost: number
  costPerUnit: number
  suggestedPrice30: number
  suggestedPrice40: number
  suggestedPrice50: number
  ingredients: {
    name: string
    quantity: number
    unit: string
    pricePerUnit: number
    lineCost: number
  }[]
}

/**
 * Calculate recipe cost via Supabase RPC.
 * Uses the `calculate_recipe_cost` function which runs server-side
 * to compute ingredient + packaging costs with margin suggestions.
 *
 * @param recipeId - UUID of the recipe
 * @param quantity - Multiplier (e.g. 30 for 30 batches)
 * @returns Full cost breakdown or null on error
 */
export async function calculateRecipeCost(
  recipeId: string,
  quantity: number = 1
): Promise<RecipeCostBreakdown | null> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc("calculate_recipe_cost", {
    p_recipe_id: recipeId,
    p_quantity: quantity,
  })

  if (error) {
    console.error("Error calculating recipe cost:", error.message)
    return null
  }

  if (!data || data.error) {
    console.error("RPC error:", data?.error)
    return null
  }

  return {
    recipeId: data.recipe_id,
    recipeName: data.recipe_name,
    yieldQuantity: Number(data.yield_quantity),
    yieldUnit: data.yield_unit,
    multiplier: Number(data.multiplier),
    totalUnits: Number(data.total_units),
    ingredientCost: Number(data.ingredient_cost),
    packagingCost: Number(data.packaging_cost),
    totalCost: Number(data.total_cost),
    costPerUnit: Number(data.cost_per_unit),
    suggestedPrice30: Number(data.suggested_price_30),
    suggestedPrice40: Number(data.suggested_price_40),
    suggestedPrice50: Number(data.suggested_price_50),
    ingredients: (data.ingredients || []).map((ing: any) => ({
      name: ing.name,
      quantity: Number(ing.quantity),
      unit: ing.unit,
      pricePerUnit: Number(ing.price_per_unit),
      lineCost: Number(ing.line_cost),
    })),
  }
}

/**
 * Format a cost breakdown into a human-readable summary.
 */
export function formatCostSummary(cost: RecipeCostBreakdown): string {
  return `${cost.totalCost.toFixed(3)} TND pour ${cost.totalUnits} ${cost.yieldUnit} (${cost.costPerUnit.toFixed(3)} TND/unite)`
}

/**
 * Calculate margin percentage between cost and selling price.
 */
export function calculateMargin(costPerUnit: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0
  return ((sellingPrice - costPerUnit) / sellingPrice) * 100
}
