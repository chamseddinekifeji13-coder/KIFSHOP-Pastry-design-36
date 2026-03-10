import { createClient } from "@/lib/supabase/client"

export interface RecipeIngredient {
  id: string
  rawMaterialId: string
  quantity: number
  unit: string
}

export interface RecipePackaging {
  id: string
  packagingId: string
  name: string
  quantity: number
  weightGrams: number
  unit: string
}

export interface Recipe {
  id: string
  tenantId: string
  name: string
  category: string | null
  finishedProductId: string | null
  yieldQuantity: number
  yieldUnit: string
  instructions: string | null
  ingredients: RecipeIngredient[]
  packaging: RecipePackaging[]
  theoreticalQuantity: number | null
  packagedQuantity: number | null
  wastagePercent: number | null
  createdAt: string
}

export interface ProductionRun {
  id: string
  tenantId: string
  recipeId: string
  quantityMultiplier: number
  status: string
  startedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
}

export async function fetchRecipes(tenantId: string): Promise<Recipe[]> {
  const supabase = createClient()
  const { data: recipes, error } = await supabase
    .from("recipes").select("*").eq("tenant_id", tenantId).order("name")
  if (error) { console.error("Error fetching recipes:", error.message); return [] }
  if (!recipes || recipes.length === 0) return []

  const recipeIds = recipes.map((r) => r.id)
  
  // Fetch ingredients
  const { data: allIngredients } = await supabase
    .from("recipe_ingredients").select("*").in("recipe_id", recipeIds)
  
  // Fetch packaging
  const { data: allPackaging } = await supabase
    .from("recipe_packaging").select("*").in("recipe_id", recipeIds)

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>()
  const packagingByRecipe = new Map<string, RecipePackaging[]>()
  
  allIngredients?.forEach((i) => {
    const list = ingredientsByRecipe.get(i.recipe_id) || []
    list.push({ id: i.id, rawMaterialId: i.raw_material_id, quantity: Number(i.quantity), unit: i.unit })
    ingredientsByRecipe.set(i.recipe_id, list)
  })
  
  allPackaging?.forEach((p) => {
    const list = packagingByRecipe.get(p.recipe_id) || []
    list.push({ 
      id: p.id, 
      packagingId: p.packaging_id, 
      name: p.name || "", 
      quantity: p.quantity, 
      weightGrams: Number(p.weight_grams),
      unit: p.unit || "pcs"
    })
    packagingByRecipe.set(p.recipe_id, list)
  })

  return recipes.map((r) => ({
    id: r.id, tenantId: r.tenant_id, name: r.name, category: r.category,
    finishedProductId: r.finished_product_id, yieldQuantity: Number(r.yield_quantity),
    yieldUnit: r.yield_unit, instructions: r.instructions,
    ingredients: ingredientsByRecipe.get(r.id) || [],
    packaging: packagingByRecipe.get(r.id) || [],
    theoreticalQuantity: Number(r.theoretical_quantity) || null,
    packagedQuantity: Number(r.packaged_quantity) || null,
    wastagePercent: Number(r.wastage_percent) || null,
    createdAt: r.created_at,
  }))
}

export async function createRecipe(tenantId: string, data: {
  name: string; category?: string; finishedProductId?: string; yieldQuantity: number;
  yieldUnit: string; instructions?: string; theoreticalQuantity?: number;
  packagedQuantity?: number; wastagePercent?: number;
  ingredients: { rawMaterialId: string; quantity: number; unit: string }[]
  packaging?: { packagingId: string; name: string; quantity: number; weightGrams: number; unit: string }[]
}): Promise<Recipe | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("recipes").insert({
    tenant_id: tenantId, name: data.name, category: data.category || null,
    finished_product_id: data.finishedProductId || null,
    yield_quantity: data.yieldQuantity, yield_unit: data.yieldUnit,
    instructions: data.instructions || null,
    theoretical_quantity: data.theoreticalQuantity || null,
    packaged_quantity: data.packagedQuantity || null,
    wastage_percent: data.wastagePercent || null,
  }).select().single()
  if (error || !row) { console.error("Error creating recipe:", error?.message); return null }

  // Insert ingredients
  if (data.ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      data.ingredients.map((i) => ({ recipe_id: row.id, raw_material_id: i.rawMaterialId, quantity: i.quantity, unit: i.unit }))
    )
  }
  
  // Insert packaging
  if (data.packaging && data.packaging.length > 0) {
    await supabase.from("recipe_packaging").insert(
      data.packaging.map((p) => ({ 
        recipe_id: row.id, 
        packaging_id: p.packagingId, 
        name: p.name,
        quantity: p.quantity, 
        weight_grams: p.weightGrams,
        unit: p.unit,
        tenant_id: tenantId
      }))
    )
  }
  
  return { 
    id: row.id, tenantId: row.tenant_id, name: row.name, category: row.category,
    finishedProductId: row.finished_product_id, yieldQuantity: Number(row.yield_quantity),
    yieldUnit: row.yield_unit, instructions: row.instructions,
    ingredients: data.ingredients.map((i, idx) => ({ id: `new-${idx}`, ...i })), 
    packaging: data.packaging || [],
    theoreticalQuantity: data.theoreticalQuantity || null,
    packagedQuantity: data.packagedQuantity || null,
    wastagePercent: data.wastagePercent || null,
    createdAt: row.created_at 
  }
}

export interface ConsumedIngredient {
  name: string
  quantity: number
  unit: string
  price_per_unit: number
  line_cost: number
  previous_stock: number
  new_stock: number
}

export interface ConsumeResult {
  success: boolean
  error?: string
  production_run_id?: string
  recipe_name?: string
  multiplier?: number
  finished_product_id?: string | null
  finished_product_units?: number
  total_cost?: number
  cost_per_unit?: number
  ingredients_consumed?: ConsumedIngredient[]
}

/**
 * Atomic production: consumes recipe ingredients, deducts stock,
 * creates production_run, adds finished product stock.
 * Rolls back entirely if any ingredient stock is insufficient.
 */
export async function consumeRecipeIngredients(
  recipeId: string,
  producedQty: number,
  producedBy?: string,
  notes?: string
): Promise<ConsumeResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("consume_recipe_ingredients", {
    p_recipe_id: recipeId,
    p_produced_qty: producedQty,
    p_produced_by: producedBy || null,
    p_notes: notes || null,
  })

  if (error) {
    console.error("Error consuming recipe ingredients:", error.message)
    // Parse the Postgres error for user-friendly message
    const stockMatch = error.message.match(/Stock insuffisant pour (.+?): disponible=(.+?) (.+?), requis=(.+?) (.+)/)
    if (stockMatch) {
      return {
        success: false,
        error: `Stock insuffisant pour ${stockMatch[1]}: ${stockMatch[2]}${stockMatch[3]} disponible, ${stockMatch[4]}${stockMatch[5]} requis`,
      }
    }
    return { success: false, error: error.message }
  }

  if (data?.error) {
    return { success: false, error: data.error }
  }

  return {
    success: true,
    production_run_id: data.production_run_id,
    recipe_name: data.recipe_name,
    multiplier: data.multiplier,
    finished_product_id: data.finished_product_id,
    finished_product_units: data.finished_product_units,
    total_cost: data.total_cost,
    cost_per_unit: data.cost_per_unit,
    ingredients_consumed: data.ingredients_consumed,
  }
}

/**
 * Unified function: completes a production plan by consuming ingredients,
 * deducting stock, and optionally updating the plan status.
 */
export async function completeProduction(
  recipeId: string,
  quantity: number,
  producedBy?: string,
  notes?: string,
  planId?: string
): Promise<ConsumeResult> {
  // 1. Atomic consume + stock deduction + production_run
  const result = await consumeRecipeIngredients(recipeId, quantity, producedBy, notes)

  // 2. If linked to a production plan, update its status
  if (result.success && planId) {
    const supabase = createClient()
    const { error } = await supabase
      .from("production_plans")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", planId)
    if (error) {
      console.error("Error updating plan status after production:", error.message)
      // Production already happened, just log the error
    }
  }

  return result
}

export async function fetchProductionRuns(tenantId: string): Promise<ProductionRun[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("production_runs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })
  if (error) { console.error("Error fetching production runs:", error.message); return [] }
  return (data || []).map((r) => ({
    id: r.id, tenantId: r.tenant_id, recipeId: r.recipe_id,
    quantityMultiplier: Number(r.quantity_multiplier), status: r.status,
    startedAt: r.started_at, completedAt: r.completed_at, notes: r.notes, createdAt: r.created_at,
  }))
}
