import { createClient } from "@/lib/supabase/client"

export interface RecipeIngredient {
  id: string
  rawMaterialId: string
  quantity: number
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
  const { data: allIngredients } = await supabase
    .from("recipe_ingredients").select("*").in("recipe_id", recipeIds)

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>()
  allIngredients?.forEach((i) => {
    const list = ingredientsByRecipe.get(i.recipe_id) || []
    list.push({ id: i.id, rawMaterialId: i.raw_material_id, quantity: Number(i.quantity), unit: i.unit })
    ingredientsByRecipe.set(i.recipe_id, list)
  })

  return recipes.map((r) => ({
    id: r.id, tenantId: r.tenant_id, name: r.name, category: r.category,
    finishedProductId: r.finished_product_id, yieldQuantity: Number(r.yield_quantity),
    yieldUnit: r.yield_unit, instructions: r.instructions,
    ingredients: ingredientsByRecipe.get(r.id) || [], createdAt: r.created_at,
  }))
}

export async function createRecipe(tenantId: string, data: {
  name: string; category?: string; finishedProductId?: string; yieldQuantity: number;
  yieldUnit: string; instructions?: string;
  ingredients: { rawMaterialId: string; quantity: number; unit: string }[]
}): Promise<Recipe | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("recipes").insert({
    tenant_id: tenantId, name: data.name, category: data.category || null,
    finished_product_id: data.finishedProductId || null,
    yield_quantity: data.yieldQuantity, yield_unit: data.yieldUnit,
    instructions: data.instructions || null,
  }).select().single()
  if (error || !row) { console.error("Error creating recipe:", error?.message); return null }

  if (data.ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      data.ingredients.map((i) => ({ recipe_id: row.id, raw_material_id: i.rawMaterialId, quantity: i.quantity, unit: i.unit }))
    )
  }
  return { id: row.id, tenantId: row.tenant_id, name: row.name, category: row.category,
    finishedProductId: row.finished_product_id, yieldQuantity: Number(row.yield_quantity),
    yieldUnit: row.yield_unit, instructions: row.instructions,
    ingredients: data.ingredients.map((i, idx) => ({ id: `new-${idx}`, ...i })), createdAt: row.created_at }
}

export interface ConsumeResult {
  success: boolean
  error?: string
  production_run_id?: string
  recipe_name?: string
  multiplier?: number
  finished_product_id?: string | null
  finished_product_units?: number
  ingredients_consumed?: {
    name: string
    quantity: number
    unit: string
    previous_stock: number
    new_stock: number
  }[]
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
    ingredients_consumed: data.ingredients_consumed,
  }
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
