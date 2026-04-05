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
}): Promise<Recipe> {
  const supabase = createClient()
  const insertPayload = {
    tenant_id: tenantId, name: data.name, category: data.category || null,
    finished_product_id: data.finishedProductId || null,
    yield_quantity: data.yieldQuantity || 0, yield_unit: data.yieldUnit || "unites",
    instructions: data.instructions || null,
    theoretical_quantity: data.theoreticalQuantity || null,
    packaged_quantity: data.packagedQuantity || null,
    wastage_percent: data.wastagePercent || null,
  }
  const { data: row, error } = await supabase.from("recipes").insert(insertPayload).select().single()
  if (error || !row) {
    console.error("Error creating recipe:", error?.message, "Payload:", JSON.stringify(insertPayload))
    throw new Error(error?.message || "Impossible de creer la recette")
  }

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
}): Promise<Recipe> {
  const supabase = createClient()
  
  // Update recipe main data
  const { data: row, error } = await supabase.from("recipes").update({
    name: data.name, category: data.category || null,
    finished_product_id: data.finishedProductId || null,
    yield_quantity: data.yieldQuantity || 0, yield_unit: data.yieldUnit || "unites",
    instructions: data.instructions || null,
    theoretical_quantity: data.theoreticalQuantity || null,
    packaged_quantity: data.packagedQuantity || null,
    wastage_percent: data.wastagePercent || null,
    updated_at: new Date().toISOString()
  }).eq("id", recipeId).eq("tenant_id", tenantId).select().single()
  
  if (error || !row) {
    console.error("Error updating recipe:", error?.message)
    throw new Error(error?.message || "Impossible de modifier la recette")
  }

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
  const supabase = createClient()

  // 1. Atomic consume + stock deduction + production_run
  const result = await consumeRecipeIngredients(recipeId, quantity, producedBy, notes)

  // 2. If linked to a production plan, update its status
  if (result.success && planId) {
    const { error } = await supabase
      .from("production_plans")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", planId)
    if (error) {
      console.error("Error updating plan status after production:", error.message)
    }
  }

  // 3. Auto-create a production batch for conditioning
  if (result.success) {
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("tenant_id")
      .eq("id", recipeId)
      .single()
    if (recipeError || !recipe) {
      throw new Error(recipeError?.message || "Recette introuvable pour la creation automatique du lot")
    }

    // Avoid duplicate auto-batch if a recent one was already created.
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data: recentBatch, error: recentBatchError } = await supabase
      .from("production_batches")
      .select("id")
      .eq("tenant_id", recipe.tenant_id)
      .eq("recipe_id", recipeId)
      .gte("created_at", twoMinAgo)
      .limit(1)
      .maybeSingle()

    if (recentBatchError) {
      throw new Error(`Echec verification lot recent: ${recentBatchError.message}`)
    }

    if (!recentBatch) {
      const payload = {
        tenant_id: recipe.tenant_id,
        recipe_id: recipeId,
        recipe_name: result.recipe_name,
        produced_quantity: result.finished_product_units || quantity,
        produced_unit: "unites",
        remaining_quantity: result.finished_product_units || quantity,
        notes: notes || `Genere automatiquement depuis le plan de production`,
      }

      const { error: insertError } = await supabase.from("production_batches").insert(payload)
      if (insertError) {
        // Recovery path: if another process inserted it first, treat as success.
        const { data: recoveredBatch, error: recoverError } = await supabase
          .from("production_batches")
          .select("id")
          .eq("tenant_id", recipe.tenant_id)
          .eq("recipe_id", recipeId)
          .gte("created_at", twoMinAgo)
          .limit(1)
          .maybeSingle()
        if (recoverError || !recoveredBatch) {
          throw new Error(`Echec creation auto lot: ${insertError.message}`)
        }
      }
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

  // Protection contre double consommation: verifier si un lot avec la meme recette
  // a ete cree dans les 2 dernieres minutes
  if (data.recipeId) {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data: recentBatches } = await supabase
      .from("production_batches")
      .select("id")
      .eq("recipe_id", data.recipeId)
      .eq("tenant_id", tenantId)
      .gte("created_at", twoMinAgo)
      .limit(1)
    const { data: recentRuns } = await supabase
      .from("production_runs")
      .select("id")
      .eq("recipe_id", data.recipeId)
      .eq("tenant_id", tenantId)
      .gte("created_at", twoMinAgo)
      .limit(1)
    if ((recentBatches && recentBatches.length > 0) || (recentRuns && recentRuns.length > 0)) {
      throw new Error("Un lot pour cette recette a deja ete cree il y a moins de 2 minutes. Veuillez patienter avant de relancer.")
    }
  }

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
  const totalGrams = Number(data.weightGrams) * data.quantity
  let sessionIdForRollback: string | null = null
  
  // 1. Créer la session de conditionnement
  const { data: session, error } = await supabase.from("batch_packaging_sessions").insert({
    batch_id: batchId, 
    tenant_id: tenantId, 
    packaging_id: data.packagingId || null,
    packaging_name: data.packagingName, 
    weight_grams: data.weightGrams,
    quantity: data.quantity, 
    total_grams: totalGrams,
    notes: data.notes || null,
  }).select().single()
  
  if (error || !session) { 
    console.error("Error adding packaging session:", error?.message)
    throw new Error(error?.message || "Erreur lors de l'ajout de la session de conditionnement")
  }
  sessionIdForRollback = session.id
  
  // 2. Ajouter les produits finis au stock (si finishedProductId fourni) — optimistic locking
  if (data.finishedProductId) {
    try {
      const { data: product, error: productReadError } = await supabase
        .from("finished_products")
        .select("current_stock")
        .eq("id", data.finishedProductId)
        .maybeSingle()

      if (productReadError) {
        throw new Error(`Echec lecture produit fini: ${productReadError.message}`)
      }
      if (!product) {
        throw new Error("Produit fini introuvable: il a ete supprime avant la mise a jour de stock")
      }

      const oldStock = Number(product.current_stock)
      const { data: updatedRow, error: updateError } = await supabase
        .from("finished_products")
        .update({ current_stock: oldStock + data.quantity })
        .eq("id", data.finishedProductId)
        .eq("current_stock", oldStock) // optimistic lock
        .select("id")
        .maybeSingle()
      if (updateError) {
        throw new Error(`Echec mise a jour stock: ${updateError.message}`)
      }

      // No row updated => likely lock conflict, retry once with fresh stock.
      if (!updatedRow) {
        console.error("Stock update conflict, retrying...")
        const { data: fresh, error: freshReadError } = await supabase
          .from("finished_products")
          .select("current_stock")
          .eq("id", data.finishedProductId)
          .maybeSingle()
        if (freshReadError) {
          throw new Error(`Echec relecture stock apres conflit: ${freshReadError.message}`)
        }
        if (!fresh) {
          throw new Error("Produit fini introuvable apres conflit: il a ete supprime pendant le retry")
        }

        const { data: retriedRow, error: retryError } = await supabase
          .from("finished_products")
          .update({ current_stock: Number(fresh.current_stock) + data.quantity })
          .eq("id", data.finishedProductId)
          .eq("current_stock", Number(fresh.current_stock))
          .select("id")
          .maybeSingle()
        if (retryError) {
          throw new Error(`Echec mise a jour stock apres retry: ${retryError.message}`)
        }
        if (!retriedRow) {
          throw new Error("Conflit de stock persistant: impossible d'appliquer la mise a jour apres retry")
        }
      }
    } catch (stockError: any) {
      if (sessionIdForRollback) {
        const { error: rollbackError } = await supabase
          .from("batch_packaging_sessions")
          .delete()
          .eq("id", sessionIdForRollback)
        if (rollbackError) {
          console.error("Rollback packaging session failed:", rollbackError.message)
        }
      }
      throw new Error(stockError?.message || "Erreur lors de la mise a jour du stock")
    }
  }
  
  // 3. Mettre à jour le lot: remaining_quantity et status
  const { data: batch, error: batchReadError } = await supabase
    .from("production_batches")
    .select("produced_quantity, remaining_quantity")
    .eq("id", batchId)
    .single()
  if (batchReadError) {
    throw new Error(`Echec lecture lot de production: ${batchReadError.message}`)
  }
  
  if (batch) {
    const newRemaining = Number(batch.remaining_quantity) - totalGrams
    const newStatus = newRemaining <= 0 ? "termine" : "partiellement_conditionne"
    const { error: batchUpdateError } = await supabase.from("production_batches").update({
      remaining_quantity: Math.max(0, newRemaining), 
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq("id", batchId)
    if (batchUpdateError) {
      throw new Error(`Echec mise a jour lot de production: ${batchUpdateError.message}`)
    }
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

// ─── Fetch packaging sessions for a batch ─────────────────
export async function fetchBatchPackagingSessions(batchId: string): Promise<BatchPackagingSession[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("batch_packaging_sessions")
    .select("*")
    .eq("batch_id", batchId)
    .order("session_date", { ascending: false })
  if (error) { console.error("Error fetching batch sessions:", error.message); return [] }
  return (data || []).map((s) => ({
    id: s.id,
    batchId: s.batch_id,
    packagingId: s.packaging_id,
    packagingName: s.packaging_name,
    weightGrams: Number(s.weight_grams),
    quantity: s.quantity,
    totalGrams: Number(s.total_grams),
    sessionDate: s.session_date,
  }))
}

// ─── Production runs with recipe names ────────────────────
export interface ProductionRunWithRecipe extends ProductionRun {
  recipeName: string
  totalCost: number | null
  costPerUnit: number | null
}

export async function fetchProductionRunsWithRecipes(tenantId: string): Promise<ProductionRunWithRecipe[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("production_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) { console.error("Error fetching production runs:", error.message); return [] }
  if (!data || data.length === 0) return []

  // Fetch recipe names for all unique recipe IDs
  const recipeIds = [...new Set(data.map((r) => r.recipe_id).filter(Boolean))]
  const recipeMap = new Map<string, string>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, name")
      .in("id", recipeIds)
    recipes?.forEach((r) => recipeMap.set(r.id, r.name))
  }

  return data.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    recipeId: r.recipe_id,
    quantityMultiplier: Number(r.quantity_multiplier),
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    notes: r.notes,
    createdAt: r.created_at,
    recipeName: recipeMap.get(r.recipe_id) || "Recette supprimee",
    totalCost: r.total_cost != null ? Number(r.total_cost) : null,
    costPerUnit: r.cost_per_unit != null ? Number(r.cost_per_unit) : null,
  }))
}

// ─── Count production runs for the current month ──────────
export async function countMonthlyProductionRuns(tenantId: string): Promise<number> {
  const supabase = createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count, error } = await supabase
    .from("production_runs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfMonth)
  if (error) { console.error("Error counting monthly runs:", error.message); return 0 }
  return count || 0
}
