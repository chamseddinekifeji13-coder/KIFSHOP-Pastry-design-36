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

export interface ProductionBatch {
  id: string
  tenantId: string
  recipeId: string | null
  recipeName: string
  producedQuantity: number
  producedUnit: string
  remainingQuantity: number
  status: "en_cours" | "partiellement_conditionne" | "termine"
  productionDate: string
  notes: string | null
  createdAt: string
}

export interface BatchPackagingSession {
  id: string
  batchId: string
  packagingId: string | null
  packagingName: string
  weightGrams: number
  quantity: number
  totalGrams: number
  sessionDate: string
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
    packaging: (data.packaging || []).map((p, idx) => ({ id: `pkg-${idx}`, ...p })),
    theoreticalQuantity: data.theoreticalQuantity || null,
    packagedQuantity: data.packagedQuantity || null,
    wastagePercent: data.wastagePercent || null,
    createdAt: row.created_at 
  }
}

// ─── Update Recipe ────────────────────────────────────────────
export async function updateRecipe(recipeId: string, tenantId: string, data: {
  name: string
  category?: string
  finishedProductId?: string | null
  yieldQuantity: number
  yieldUnit: string
  instructions?: string
  theoreticalQuantity?: number | null
  packagedQuantity?: number | null
  wastagePercent?: number | null
  ingredients: { rawMaterialId: string; quantity: number; unit: string }[]
  packaging?: { packagingId: string; name: string; quantity: number; weightGrams: number; unit: string }[]
}): Promise<Recipe | null> {
  const supabase = createClient()
  
  // Update recipe main data
  const { data: row, error } = await supabase.from("recipes").update({
    name: data.name, category: data.category || null,
    finished_product_id: data.finishedProductId || null,
    yield_quantity: data.yieldQuantity, yield_unit: data.yieldUnit,
    instructions: data.instructions || null,
    theoretical_quantity: data.theoreticalQuantity || null,
    packaged_quantity: data.packagedQuantity || null,
    wastage_percent: data.wastagePercent || null,
    updated_at: new Date().toISOString()
  }).eq("id", recipeId).eq("tenant_id", tenantId).select().single()
  
  if (error || !row) { console.error("Error updating recipe:", error?.message); return null }

  // Delete existing ingredients and packaging, then re-insert
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId)
  await supabase.from("recipe_packaging").delete().eq("recipe_id", recipeId)

  // Insert new ingredients
  if (data.ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      data.ingredients.map((i) => ({ recipe_id: recipeId, raw_material_id: i.rawMaterialId, quantity: i.quantity, unit: i.unit }))
    )
  }
  
  // Insert new packaging
  if (data.packaging && data.packaging.length > 0) {
    await supabase.from("recipe_packaging").insert(
      data.packaging.map((p) => ({ 
        recipe_id: recipeId, 
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
    ingredients: data.ingredients.map((i, idx) => ({ id: `updated-${idx}`, ...i })), 
    packaging: (data.packaging || []).map((p, idx) => ({ id: `pkg-${idx}`, ...p })),
    theoreticalQuantity: data.theoreticalQuantity || null,
    packagedQuantity: data.packagedQuantity || null,
    wastagePercent: data.wastagePercent || null,
    createdAt: row.created_at 
  }
}

// ─── Delete Recipe ────────────────────────────────────────────
export async function deleteRecipe(recipeId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  // Check if recipe is used in active production batches
  const { data: activeBatches } = await supabase
    .from("production_batches")
    .select("id")
    .eq("recipe_id", recipeId)
    .in("status", ["en_cours", "partiellement_conditionne"])
    .limit(1)
  
  if (activeBatches && activeBatches.length > 0) {
    return { success: false, error: "Cette recette est utilisee dans des lots de production actifs" }
  }
  
  // Delete related data first (ingredients, packaging)
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId)
  await supabase.from("recipe_packaging").delete().eq("recipe_id", recipeId)
  
  // Delete the recipe
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("tenant_id", tenantId)
  
  if (error) {
    console.error("Error deleting recipe:", error.message)
    return { success: false, error: error.message }
  }
  
  return { success: true }
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

export async function fetchProductionBatches(tenantId: string): Promise<ProductionBatch[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("production_batches").select("*").eq("tenant_id", tenantId).order("production_date", { ascending: false })
  if (error) { console.error("Error fetching batches:", error.message); return [] }
  return (data || []).map((b) => ({
    id: b.id, tenantId: b.tenant_id, recipeId: b.recipe_id, recipeName: b.recipe_name,
    producedQuantity: Number(b.produced_quantity), producedUnit: b.produced_unit,
    remainingQuantity: Number(b.remaining_quantity), status: b.status,
    productionDate: b.production_date, notes: b.notes, createdAt: b.created_at,
  }))
}

export async function createProductionBatch(tenantId: string, data: {
  recipeId?: string; recipeName: string; producedQuantity: number; producedUnit: string; notes?: string
}): Promise<ProductionBatch | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Si une recette est liée, déduire les matières premières du stock
  let consumeResult = null
  if (data.recipeId) {
    consumeResult = await consumeRecipeIngredients(data.recipeId, data.producedQuantity, user?.id, data.notes)
    if (!consumeResult.success) {
      console.error("Stock deduction failed:", consumeResult.error)
      throw new Error(consumeResult.error || "Erreur lors de la déduction du stock")
    }
  }

  // Créer le lot de production vrac
  const { data: batch, error } = await supabase.from("production_batches").insert({
    tenant_id: tenantId, 
    recipe_id: data.recipeId || null, 
    recipe_name: data.recipeName,
    produced_quantity: data.producedQuantity, 
    produced_unit: data.producedUnit,
    remaining_quantity: data.producedQuantity,
    notes: data.notes || null,
  }).select().single()
  
  if (error || !batch) { 
    console.error("Error creating batch:", error?.message)
    throw new Error(error?.message || "Erreur lors de la création du lot")
  }
  
  return {
    id: batch.id, 
    tenantId: batch.tenant_id, 
    recipeId: batch.recipe_id, 
    recipeName: batch.recipe_name,
    producedQuantity: Number(batch.produced_quantity), 
    producedUnit: batch.produced_unit,
    remainingQuantity: Number(batch.remaining_quantity), 
    status: batch.status,
    productionDate: batch.production_date, 
    notes: batch.notes, 
    createdAt: batch.created_at,
  }
}

export async function addPackagingSession(tenantId: string, batchId: string, data: {
  finishedProductId?: string; packagingId?: string; packagingName: string; weightGrams: number; quantity: number; notes?: string
}): Promise<BatchPackagingSession | null> {
  const supabase = createClient()
  
  // 1. Créer la session de conditionnement
  const { data: session, error } = await supabase.from("batch_packaging_sessions").insert({
    batch_id: batchId, 
    tenant_id: tenantId, 
    packaging_id: data.packagingId || null,
    packaging_name: data.packagingName, 
    weight_grams: data.weightGrams,
    quantity: data.quantity, 
    notes: data.notes || null,
  }).select().single()
  
  if (error || !session) { 
    console.error("Error adding packaging session:", error?.message)
    throw new Error(error?.message || "Erreur lors de l'ajout de la session de conditionnement")
  }
  
  // 2. Ajouter les produits finis au stock (si finishedProductId fourni)
  if (data.finishedProductId) {
    const { data: product, error: productError } = await supabase
      .from("finished_products")
      .select("current_stock")
      .eq("id", data.finishedProductId)
      .single()
    
    if (product) {
      const newStock = Number(product.current_stock) + data.quantity
      await supabase
        .from("finished_products")
        .update({ current_stock: newStock })
        .eq("id", data.finishedProductId)
    }
  }
  
  // 3. Mettre à jour le lot: remaining_quantity et status
  const totalGrams = Number(data.weightGrams) * data.quantity
  const { data: batch } = await supabase
    .from("production_batches")
    .select("produced_quantity, remaining_quantity")
    .eq("id", batchId)
    .single()
  
  if (batch) {
    const newRemaining = Number(batch.remaining_quantity) - totalGrams
    const newStatus = newRemaining <= 0 ? "termine" : "partiellement_conditionne"
    await supabase.from("production_batches").update({
      remaining_quantity: Math.max(0, newRemaining), 
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq("id", batchId)
  }
  
  return {
    id: session.id, 
    batchId: session.batch_id, 
    packagingId: session.packaging_id,
    packagingName: session.packaging_name, 
    weightGrams: Number(session.weight_grams),
    quantity: session.quantity, 
    totalGrams: Number(session.total_grams), 
    sessionDate: session.session_date,
  }
}
