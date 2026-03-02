import { createClient } from "@/lib/supabase/client"

// ─── String normalization helpers ────────────────────────────
// Normalizes strings for comparison: removes accents, extra spaces, lowercase
function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // Multiple spaces → single space
    .normalize("NFD") // Decompose accents
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
}

// Calculate similarity between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1)
  const s2 = normalizeString(str2)
  
  if (s1 === s2) return 1
  
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1
  
  const editDistance = getEditDistance(shorter, longer)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance for similarity
function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

// ─── Auth helper ─────────────────────────────────────────────
// Verifies auth session and that tenantId matches the user's actual tenant
async function verifyAuthAndTenant(tenantId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")
  // Verify the tenantId matches the user's tenant (prevents spoofing)
  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .limit(1)
    .single()
  if (!tu) throw new Error("Acces refuse: tenant invalide")
  return { supabase, user }
}

// ─── Types ────────────────────────────────────────────────────

export interface RawMaterial {
  id: string
  tenantId: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  pricePerUnit: number
  supplier: string | null
  storageLocationId: string | null
  createdAt: string
}

export interface FinishedProduct {
  id: string
  tenantId: string
  categoryId: string | null
  name: string
  description: string | null
  unit: string
  currentStock: number
  minStock: number
  sellingPrice: number
  costPrice: number
  packagingCost: number
  ingredientCost: number
  imageUrl: string | null
  weight: string | null
  isPublished: boolean
  minOrder: number
  tags: string[]
  storageLocationId: string | null
  createdAt: string
}

export interface Category {
  id: string
  tenantId: string
  name: string
  color: string
}

export interface StockMovement {
  id: string
  tenantId: string
  itemType: string
  rawMaterialId: string | null
  finishedProductId: string | null
  movementType: string
  quantity: number
  unit: string
  reason: string | null
  reference: string | null
  createdAt: string
}

// ─── Raw Materials ────────────────────────────────────────────

export async function fetchRawMaterials(tenantId: string): Promise<RawMaterial[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("raw_materials")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")

  if (error) { console.error("Error fetching raw materials:", error.message); return [] }
  return (data || []).map((r) => ({
    id: r.id, tenantId: r.tenant_id, name: r.name, unit: r.unit,
    currentStock: Number(r.current_stock), minStock: Number(r.min_stock),
    pricePerUnit: Number(r.price_per_unit), supplier: r.supplier,
    storageLocationId: r.storage_location_id || null,
    createdAt: r.created_at,
  }))
}

export async function createRawMaterial(tenantId: string, data: {
  name: string; unit: string; currentStock: number; minStock: number; pricePerUnit: number; supplier?: string; barcode?: string; storageLocationId?: string
}): Promise<RawMaterial | null> {
  const { supabase } = await verifyAuthAndTenant(tenantId)
  
  // Check for exact and similar duplicates
  const { data: allMaterials } = await supabase
    .from("raw_materials").select("id, name").eq("tenant_id", tenantId)
  
  if (allMaterials && allMaterials.length > 0) {
    const inputNormalized = normalizeString(data.name)
    
    // Check for exact match
    const exactMatch = allMaterials.find(m => normalizeString(m.name) === inputNormalized)
    if (exactMatch) {
      throw new Error(`DUPLICATE:La matiere premiere "${exactMatch.name}" existe deja`)
    }
    
    // Check for very similar names (95%+ similarity) - more strict threshold
    const similarMatch = allMaterials.find(m => calculateSimilarity(data.name, m.name) >= 0.95)
    if (similarMatch) {
      throw new Error(`SIMILAR:Une matiere premiere tres similaire existe deja: "${similarMatch.name}". Voulez-vous vraiment continuer?`)
    }
  }
  
  const { data: row, error } = await supabase.from("raw_materials").insert({
    tenant_id: tenantId, name: data.name, unit: data.unit,
    current_stock: data.currentStock, min_stock: data.minStock,
    price_per_unit: data.pricePerUnit, supplier: data.supplier || null,
    barcode: data.barcode || null,
    storage_location_id: data.storageLocationId || null,
  }).select().single()
  if (error) { throw new Error(error.message) }
  if (!row) { throw new Error("Aucune donnee retournee apres insertion") }
  return { id: row.id, tenantId: row.tenant_id, name: row.name, unit: row.unit,
    currentStock: Number(row.current_stock), minStock: Number(row.min_stock),
    pricePerUnit: Number(row.price_per_unit), supplier: row.supplier,
    storageLocationId: row.storage_location_id || null, createdAt: row.created_at }
}

export async function updateRawMaterial(id: string, data: Partial<{
  name: string; unit: string; currentStock: number; minStock: number; pricePerUnit: number; supplier: string; barcode: string; storageLocationId: string | null
}>): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updates.name = data.name
  if (data.unit !== undefined) updates.unit = data.unit
  if (data.currentStock !== undefined) updates.current_stock = data.currentStock
  if (data.minStock !== undefined) updates.min_stock = data.minStock
  if (data.pricePerUnit !== undefined) updates.price_per_unit = data.pricePerUnit
  if (data.supplier !== undefined) updates.supplier = data.supplier
  if (data.barcode !== undefined) updates.barcode = data.barcode
  if (data.storageLocationId !== undefined) updates.storage_location_id = data.storageLocationId
  const { error } = await supabase.from("raw_materials").update(updates).eq("id", id)
  if (error) { console.error("Error updating raw material:", error.message); return false }
  return true
}

// ─── Inventory ────────────────────────────────────────────────

export interface InventoryCountItem {
  id: string; name: string; type: "mp" | "pf"
  theoreticalQty: number; physicalQty: number; unit: string; note: string
}

export async function saveInventorySession(tenantId: string, counts: InventoryCountItem[]): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")
  const discrepancies = counts.filter(c => c.physicalQty !== c.theoreticalQty).length

  const { data: session, error } = await supabase.from("inventory_sessions").insert({
    tenant_id: tenantId, status: discrepancies > 0 ? "en-cours" : "valide",
    items_count: counts.length, discrepancies, created_by: user?.id || null,
    completed_at: discrepancies === 0 ? new Date().toISOString() : null,
  }).select("id").single()

  if (error || !session) { console.error("Error saving inventory session:", error?.message); return null }

  const rows = counts.map(c => ({
    session_id: session.id, item_type: c.type === "mp" ? "raw_material" : "finished_product",
    raw_material_id: c.type === "mp" ? c.id : null,
    finished_product_id: c.type === "pf" ? c.id : null,
    item_name: c.name, theoretical_qty: c.theoreticalQty,
    physical_qty: c.physicalQty, unit: c.unit,
    discrepancy: c.physicalQty - c.theoreticalQty, note: c.note || null,
  }))
  await supabase.from("inventory_counts").insert(rows)
  return session.id
}

export async function saveDraftInventory(
  tenantId: string,
  sessionId: string | null,
  counts: InventoryCountItem[]
): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  let sid = sessionId

  if (!sid) {
    // Create a new draft session
    const { data: session, error } = await supabase.from("inventory_sessions").insert({
      tenant_id: tenantId, status: "brouillon",
      items_count: counts.length, discrepancies: 0,
      created_by: user.id, completed_at: null,
    }).select("id").single()
    if (error || !session) { console.error("Error creating draft session:", error?.message); return null }
    sid = session.id
  } else {
    // Update existing session
    await supabase.from("inventory_sessions").update({
      items_count: counts.length, status: "brouillon",
    }).eq("id", sid)
  }

  // Delete existing counts for this session and re-insert
  await supabase.from("inventory_counts").delete().eq("session_id", sid)

  if (counts.length > 0) {
    const rows = counts.map(c => ({
      session_id: sid!, item_type: c.type === "mp" ? "raw_material" : "finished_product",
      raw_material_id: c.type === "mp" ? c.id : null,
      finished_product_id: c.type === "pf" ? c.id : null,
      item_name: c.name, theoretical_qty: c.theoreticalQty,
      physical_qty: c.physicalQty, unit: c.unit,
      discrepancy: c.physicalQty - c.theoreticalQty, note: c.note || null,
    }))
    await supabase.from("inventory_counts").insert(rows)
  }

  return sid
}

export async function loadDraftCounts(sessionId: string): Promise<{
  counts: InventoryCountItem[]
  notes: string | null
}> {
  const supabase = createClient()
  const { data: session } = await supabase
    .from("inventory_sessions").select("notes").eq("id", sessionId).single()
  const { data, error } = await supabase
    .from("inventory_counts").select("*").eq("session_id", sessionId)
  if (error) { console.error("Error loading draft counts:", error.message); return { counts: [], notes: null } }
  const counts = (data || []).map(c => ({
    id: c.raw_material_id || c.finished_product_id || c.id,
    name: c.item_name,
    type: (c.item_type === "raw_material" ? "mp" : "pf") as "mp" | "pf",
    theoreticalQty: Number(c.theoretical_qty),
    physicalQty: Number(c.physical_qty),
    unit: c.unit,
    note: c.note || "",
  }))
  return { counts, notes: session?.notes || null }
}

export async function fetchInventoryCounts(sessionId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from("inventory_counts").select("*").eq("session_id", sessionId)
  if (error) { console.error("Error fetching inventory counts:", error.message); return [] }
  return (data || []).map(c => ({
    id: c.id, sessionId: c.session_id, itemType: c.item_type,
    rawMaterialId: c.raw_material_id, finishedProductId: c.finished_product_id,
    itemName: c.item_name, theoreticalQty: Number(c.theoretical_qty),
    physicalQty: Number(c.physical_qty), unit: c.unit,
    discrepancy: Number(c.discrepancy), note: c.note,
  }))
}

export async function applyInventoryCorrections(tenantId: string, sessionId: string, corrections: {
  itemId: string; itemType: "raw_material" | "finished_product"; physicalQty: number; unit: string
}[]): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  for (const c of corrections) {
    const table = c.itemType === "raw_material" ? "raw_materials" : "finished_products"
    const { data: item } = await supabase.from(table).select("current_stock").eq("id", c.itemId).single()
    const currentStock = Number(item?.current_stock || 0)
    const delta = c.physicalQty - currentStock

    if (delta !== 0) {
      await supabase.from("stock_movements").insert({
        tenant_id: tenantId, item_type: c.itemType,
        raw_material_id: c.itemType === "raw_material" ? c.itemId : null,
        finished_product_id: c.itemType === "finished_product" ? c.itemId : null,
        movement_type: delta > 0 ? "entry" : "exit",
        quantity: Math.abs(delta), unit: c.unit,
        reason: "Ajustement inventaire", reference: `INV-${sessionId.slice(0, 8)}`,
        created_by: user?.id || null,
      })
      await supabase.from(table).update({ current_stock: c.physicalQty }).eq("id", c.itemId)
    }
  }

  await supabase.from("inventory_sessions").update({
    status: "valide", completed_at: new Date().toISOString()
  }).eq("id", sessionId)

  return true
}


export async function fetchFinishedProducts(tenantId: string): Promise<FinishedProduct[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("finished_products")
    .select("*, finished_product_packaging(quantity, packaging:packaging(price))")
    .eq("tenant_id", tenantId)
    .order("name")
  if (error) { console.error("Error fetching finished products:", error.message); return [] }
  return (data || []).map((p: any) => {
    const packagingCost = (p.finished_product_packaging || []).reduce(
      (sum: number, fpp: any) => sum + (Number(fpp.quantity) * Number(fpp.packaging?.price || 0)), 0
    )
    const costPrice = Number(p.cost_price)
    const ingredientCost = Math.max(0, costPrice - packagingCost)
    return {
      id: p.id, tenantId: p.tenant_id, categoryId: p.category_id, name: p.name,
      description: p.description, unit: p.unit, currentStock: Number(p.current_stock),
      minStock: Number(p.min_stock), sellingPrice: Number(p.selling_price),
      costPrice, packagingCost, ingredientCost,
      imageUrl: p.image_url, weight: p.weight,
      isPublished: p.is_published, minOrder: p.min_order, tags: p.tags || [], createdAt: p.created_at,
    }
  })
}

export async function createFinishedProduct(tenantId: string, data: {
  name: string; categoryId?: string; unit: string; currentStock: number; minStock: number;
  sellingPrice: number; costPrice: number; description?: string; weight?: string
}): Promise<FinishedProduct | null> {
  const supabase = createClient()
  
  // Check for exact and similar duplicates
  const { data: allProducts } = await supabase
    .from("finished_products").select("id, name").eq("tenant_id", tenantId)
  
  if (allProducts && allProducts.length > 0) {
    const inputNormalized = normalizeString(data.name)
    
    // Check for exact match
    const exactMatch = allProducts.find(p => normalizeString(p.name) === inputNormalized)
    if (exactMatch) {
      throw new Error(`DUPLICATE:Le produit fini "${exactMatch.name}" existe deja`)
    }
    
    // Check for very similar names (95%+ similarity) - more strict threshold
    const similarMatch = allProducts.find(p => calculateSimilarity(data.name, p.name) >= 0.95)
    if (similarMatch) {
      throw new Error(`SIMILAR:Un produit tres similaire existe deja: "${similarMatch.name}". Voulez-vous vraiment continuer?`)
    }
  }
  
  const { data: row, error } = await supabase.from("finished_products").insert({
    tenant_id: tenantId, name: data.name, category_id: data.categoryId || null,
    unit: data.unit, current_stock: data.currentStock, min_stock: data.minStock,
    selling_price: data.sellingPrice, cost_price: data.costPrice,
    description: data.description || null, weight: data.weight || null,
  }).select().single()
  if (error) { throw new Error(error.message) }
  if (!row) { throw new Error("Aucune donnee retournee apres insertion") }
  return { id: row.id, tenantId: row.tenant_id, categoryId: row.category_id, name: row.name,
    description: row.description, unit: row.unit, currentStock: Number(row.current_stock),
    minStock: Number(row.min_stock), sellingPrice: Number(row.selling_price),
    costPrice: Number(row.cost_price), imageUrl: row.image_url, weight: row.weight,
    isPublished: row.is_published, minOrder: row.min_order, tags: row.tags || [], createdAt: row.created_at }
}

export async function updateProductImage(productId: string, imageUrl: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("finished_products")
    .update({ image_url: imageUrl })
    .eq("id", productId)
  if (error) { console.error("Error updating product image:", error.message); return false }
  return true
}

export async function updateFinishedProduct(productId: string, data: {
  name?: string; description?: string; sellingPrice?: number; unit?: string;
  weight?: string; isPublished?: boolean; minOrder?: number; tags?: string[];
  imageUrl?: string
}): Promise<boolean> {
  const supabase = createClient()
  const update: Record<string, any> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.description !== undefined) update.description = data.description
  if (data.sellingPrice !== undefined) update.selling_price = data.sellingPrice
  if (data.unit !== undefined) update.unit = data.unit
  if (data.weight !== undefined) update.weight = data.weight
  if (data.isPublished !== undefined) update.is_published = data.isPublished
  if (data.minOrder !== undefined) update.min_order = data.minOrder
  if (data.tags !== undefined) update.tags = data.tags
  if (data.imageUrl !== undefined) update.image_url = data.imageUrl

  const { error } = await supabase.from("finished_products").update(update).eq("id", productId)
  if (error) { console.error("Error updating finished product:", error.message); return false }
  return true
}

// Alias for backward compatibility
export const addFinishedProduct = createFinishedProduct

// ─── Product Packaging (emballage lie au produit fini) ───────

export interface ProductPackagingItem {
  id: string
  packagingId: string
  packagingName: string
  packagingType: string
  quantity: number
  unitPrice: number
  unit: string
}

export async function fetchProductPackaging(productId: string): Promise<ProductPackagingItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("finished_product_packaging")
    .select("id, quantity, packaging_id, packaging:packaging(id, name, type, price, unit)")
    .eq("finished_product_id", productId)
  if (error) { console.error("Error fetching product packaging:", error.message); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    packagingId: row.packaging_id,
    packagingName: row.packaging?.name || "",
    packagingType: row.packaging?.type || "",
    quantity: Number(row.quantity),
    unitPrice: Number(row.packaging?.price || 0),
    unit: row.packaging?.unit || "unite",
  }))
}

export async function setProductPackaging(
  productId: string,
  items: { packagingId: string; quantity: number }[]
): Promise<boolean> {
  const supabase = createClient()
  // Delete existing links
  await supabase.from("finished_product_packaging").delete().eq("finished_product_id", productId)
  // Insert new links
  if (items.length > 0) {
    const rows = items.map(i => ({
      finished_product_id: productId,
      packaging_id: i.packagingId,
      quantity: i.quantity,
    }))
    const { error } = await supabase.from("finished_product_packaging").insert(rows)
    if (error) { throw new Error(error.message) }
  }
  // Recalculate cost_price = sum(packaging.price * quantity)
  await recalculateProductCost(productId)
  return true
}

export async function recalculateProductCost(productId: string): Promise<number> {
  const supabase = createClient()
  // Get packaging cost
  const { data: pkgData } = await supabase
    .from("finished_product_packaging")
    .select("quantity, packaging:packaging(price)")
    .eq("finished_product_id", productId)
  const packagingCost = (pkgData || []).reduce((sum: number, row: any) => {
    return sum + (Number(row.quantity) * Number(row.packaging?.price || 0))
  }, 0)

  // Get recipe ingredients cost (MP)
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, yield_quantity")
    .eq("finished_product_id", productId)
    .limit(1)
  let ingredientCost = 0
  if (recipes && recipes.length > 0) {
    const recipe = recipes[0]
    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("quantity, unit, raw_material:raw_materials(price_per_unit)")
      .eq("recipe_id", recipe.id)
    ingredientCost = (ingredients || []).reduce((sum: number, ing: any) => {
      return sum + (Number(ing.quantity) * Number(ing.raw_material?.price_per_unit || 0))
    }, 0)
    // Divide by yield to get cost per unit
    const yieldQty = Number(recipe.yield_quantity) || 1
    ingredientCost = ingredientCost / yieldQty
  }

  const totalCost = ingredientCost + packagingCost
  await supabase.from("finished_products").update({ cost_price: totalCost }).eq("id", productId)
  return totalCost
}

// ─── Recipes ─────────────────���────────────────────────────────

export interface RecipeIngredient {
  rawMaterialId: string
  quantity: number
  unit: string
}

export async function addRecipe(tenantId: string, data: {
  name: string; finishedProductId?: string; category?: string;
  yieldQuantity: number; yieldUnit: string; instructions?: string;
  ingredients: RecipeIngredient[]
}): Promise<boolean> {
  const supabase = createClient()
  const { data: recipe, error } = await supabase.from("recipes").insert({
    tenant_id: tenantId,
    name: data.name,
    finished_product_id: data.finishedProductId || null,
    category: data.category || null,
    yield_quantity: data.yieldQuantity,
    yield_unit: data.yieldUnit,
    instructions: data.instructions || null,
  }).select("id").single()

  if (error || !recipe) {
    console.error("Error creating recipe:", error?.message)
    return false
  }

  // Insert ingredients
  if (data.ingredients.length > 0) {
    const rows = data.ingredients.map(i => ({
      recipe_id: recipe.id,
      raw_material_id: i.rawMaterialId,
      quantity: i.quantity,
      unit: i.unit,
    }))
    const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows)
    if (ingError) {
      console.error("Error adding recipe ingredients:", ingError.message)
      return false
    }
  }

  return true
}

// ─── Categories ───────────────────────────────────────────────

export async function fetchCategories(tenantId: string): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")
  if (error) { console.error("Error fetching categories:", error.message); return [] }
  return (data || []).map((c) => ({ id: c.id, tenantId: c.tenant_id, name: c.name, color: c.color }))
}

export async function createCategory(tenantId: string, name: string, color?: string): Promise<Category | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("categories").insert({
    tenant_id: tenantId, name, color: color || "#4A7C59"
  }).select().single()
  if (error || !row) { console.error("Error creating category:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, name: row.name, color: row.color }
}

export async function updateCategory(categoryId: string, data: { name?: string; color?: string }): Promise<boolean> {
  const supabase = createClient()
  const updates: Record<string, any> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.color !== undefined) updates.color = data.color
  const { error } = await supabase.from("categories").update(updates).eq("id", categoryId)
  if (error) { console.error("Error updating category:", error.message); return false }
  return true
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("categories").delete().eq("id", categoryId)
  if (error) { console.error("Error deleting category:", error.message); return false }
  return true
}

export async function saveCategories(tenantId: string, categories: Array<{ id: string; name: string; color: string; isNew?: boolean }>): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  try {
    // Fetch existing categories
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("tenant_id", tenantId)
    const existingIds = (existing || []).map(c => c.id)

    // Determine which categories to create, update, or delete
    const newCategories = categories.filter(c => c.isNew)
    const updatedCategories = categories.filter(c => !c.isNew)
    const deletedCategoryIds = existingIds.filter(id => !categories.some(c => c.id === id))

    // Create new categories
    if (newCategories.length > 0) {
      const rowsToInsert = newCategories.map(c => ({
        tenant_id: tenantId,
        name: c.name,
        color: c.color
      }))
      const { error: insertError } = await supabase.from("categories").insert(rowsToInsert)
      if (insertError) throw insertError
    }

    // Update existing categories
    for (const cat of updatedCategories) {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ name: cat.name, color: cat.color })
        .eq("id", cat.id)
      if (updateError) throw updateError
    }

    // Delete removed categories
    if (deletedCategoryIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .in("id", deletedCategoryIds)
      if (deleteError) throw deleteError
    }

    return true
  } catch (error) {
    console.error("Error saving categories:", error)
    return false
  }
}

// ─── Packaging ────────────────────────────────────────────────

export interface Packaging {
  id: string
  tenantId: string
  name: string
  type: string
  description: string | null
  unit: string
  currentStock: number
  minStock: number
  price: number
  createdAt: string
}

export async function fetchPackaging(tenantId: string): Promise<Packaging[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("packaging")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")
  if (error) { console.error("Error fetching packaging:", error.message); return [] }
  return (data || []).map((p) => ({
    id: p.id, tenantId: p.tenant_id, name: p.name, type: p.type,
    description: p.description, unit: p.unit,
    currentStock: Number(p.current_stock), minStock: Number(p.min_stock),
    price: Number(p.price), createdAt: p.created_at,
  }))
}

export async function createPackaging(tenantId: string, data: {
  name: string; type: string; unit: string; currentStock: number;
  minStock: number; price: number; description?: string
}): Promise<Packaging | null> {
  const supabase = createClient()
  
  // Check for exact and similar duplicates by name + type
  const { data: allPackaging } = await supabase
    .from("packaging").select("id, name, type").eq("tenant_id", tenantId)
    .eq("type", data.type)
  
  if (allPackaging && allPackaging.length > 0) {
    const inputNormalized = normalizeString(data.name)
    
    // Check for exact match
    const exactMatch = allPackaging.find(p => normalizeString(p.name) === inputNormalized)
    if (exactMatch) {
      throw new Error(`DUPLICATE:L'emballage "${exactMatch.name}" existe deja`)
    }
    
    // Check for very similar names (95%+ similarity) - more strict threshold
    const similarMatch = allPackaging.find(p => calculateSimilarity(data.name, p.name) >= 0.95)
    if (similarMatch) {
      throw new Error(`SIMILAR:Un emballage tres similaire existe deja: "${similarMatch.name}". Voulez-vous vraiment continuer?`)
    }
  }
  
  const { data: row, error } = await supabase.from("packaging").insert({
    tenant_id: tenantId, name: data.name, type: data.type, unit: data.unit,
    current_stock: data.currentStock, min_stock: data.minStock,
    price: data.price, description: data.description || null,
  }).select().single()
  if (error) { throw new Error(error.message) }
  if (!row) { throw new Error("Aucune donnee retournee apres insertion") }
  return {
    id: row.id, tenantId: row.tenant_id, name: row.name, type: row.type,
    description: row.description, unit: row.unit,
    currentStock: Number(row.current_stock), minStock: Number(row.min_stock),
    price: Number(row.price), createdAt: row.created_at,
  }
}

export async function deletePackaging(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("packaging").delete().eq("id", id)
  if (error) { console.error("Error deleting packaging:", error.message); return false }
  return true
}

// ─── Consumables (Consommables) ─────────────────────────────────

export interface Consumable {
  id: string
  tenantId: string
  name: string
  category: string
  description: string | null
  unit: string
  currentStock: number
  minStock: number
  price: number
  supplier: string | null
  storageLocationId: string | null
  createdAt: string
}

export const CONSUMABLE_CATEGORIES: Record<string, string> = {
  nettoyage: "Nettoyage",
  hygiene: "Hygiene",
  bureau: "Bureau",
  outillage: "Outillage",
  entretien: "Entretien",
  jetable: "Jetable",
  general: "General",
}

export async function fetchConsumables(tenantId: string): Promise<Consumable[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("consumables")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")
  if (error) { console.error("Error fetching consumables:", error.message); return [] }
  return (data || []).map((c) => ({
    id: c.id, tenantId: c.tenant_id, name: c.name, category: c.category,
    description: c.description, unit: c.unit,
    currentStock: Number(c.current_stock), minStock: Number(c.min_stock),
    price: Number(c.price), supplier: c.supplier,
    storageLocationId: c.storage_location_id || null, createdAt: c.created_at,
  }))
}

export async function createConsumable(tenantId: string, data: {
  name: string; category: string; unit: string; currentStock: number;
  minStock: number; price: number; description?: string; supplier?: string; storageLocationId?: string
}): Promise<Consumable | null> {
  const { supabase } = await verifyAuthAndTenant(tenantId)

  // Check for duplicates
  const { data: allConsumables } = await supabase
    .from("consumables").select("id, name").eq("tenant_id", tenantId)
  if (allConsumables && allConsumables.length > 0) {
    const inputNormalized = normalizeString(data.name)
    const exactMatch = allConsumables.find(c => normalizeString(c.name) === inputNormalized)
    if (exactMatch) {
      throw new Error(`DUPLICATE:Le consommable "${exactMatch.name}" existe deja`)
    }
    const similarMatch = allConsumables.find(c => calculateSimilarity(data.name, c.name) >= 0.95)
    if (similarMatch) {
      throw new Error(`SIMILAR:Un consommable tres similaire existe deja: "${similarMatch.name}". Voulez-vous vraiment continuer?`)
    }
  }

  const { data: row, error } = await supabase.from("consumables").insert({
    tenant_id: tenantId, name: data.name, category: data.category, unit: data.unit,
    current_stock: data.currentStock, min_stock: data.minStock,
    price: data.price, description: data.description || null,
    supplier: data.supplier || null, storage_location_id: data.storageLocationId || null,
  }).select().single()
  if (error) { throw new Error(error.message) }
  if (!row) { throw new Error("Aucune donnee retournee apres insertion") }
  return {
    id: row.id, tenantId: row.tenant_id, name: row.name, category: row.category,
    description: row.description, unit: row.unit,
    currentStock: Number(row.current_stock), minStock: Number(row.min_stock),
    price: Number(row.price), supplier: row.supplier,
    storageLocationId: row.storage_location_id || null, createdAt: row.created_at,
  }
}

export async function deleteConsumable(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("consumables").delete().eq("id", id)
  if (error) { console.error("Error deleting consumable:", error.message); return false }
  return true
}

// ─── Storage Locations (Reserves) ─────────────────────────────

export interface StorageLocation {
  id: string
  tenantId: string
  name: string
  designation: string | null
  type: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
}

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  reserve: "Reserve",
  laboratoire: "Laboratoire",
  boutique: "Boutique",
  chambre_froide: "Chambre froide",
  autre: "Autre",
}

export async function fetchStorageLocations(tenantId: string): Promise<StorageLocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("storage_locations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("is_default", { ascending: false })
    .order("name")
  if (error) { console.error("Error fetching storage locations:", error.message); return [] }
  return (data || []).map((l) => ({
    id: l.id, tenantId: l.tenant_id, name: l.name, designation: l.designation,
    type: l.type, description: l.description, isDefault: l.is_default,
    isActive: l.is_active, createdAt: l.created_at,
  }))
}

export async function createStorageLocation(tenantId: string, data: {
  name: string; designation?: string; type: string; description?: string; isDefault?: boolean
}): Promise<StorageLocation | null> {
  const supabase = createClient()
  // If setting as default, unset other defaults
  if (data.isDefault) {
    await supabase.from("storage_locations").update({ is_default: false }).eq("tenant_id", tenantId)
  }
  const { data: row, error } = await supabase.from("storage_locations").insert({
    tenant_id: tenantId, name: data.name, designation: data.designation || null,
    type: data.type, description: data.description || null, is_default: data.isDefault || false,
  }).select().single()
  if (error || !row) { console.error("Error creating storage location:", error?.message); return null }
  return {
    id: row.id, tenantId: row.tenant_id, name: row.name, designation: row.designation,
    type: row.type, description: row.description, isDefault: row.is_default,
    isActive: row.is_active, createdAt: row.created_at,
  }
}

export async function updateStorageLocation(id: string, data: Partial<{
  name: string; designation: string; type: string; description: string; isDefault: boolean; isActive: boolean
}>): Promise<boolean> {
  const supabase = createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updates.name = data.name
  if (data.designation !== undefined) updates.designation = data.designation
  if (data.type !== undefined) updates.type = data.type
  if (data.description !== undefined) updates.description = data.description
  if (data.isDefault !== undefined) updates.is_default = data.isDefault
  if (data.isActive !== undefined) updates.is_active = data.isActive
  const { error } = await supabase.from("storage_locations").update(updates).eq("id", id)
  if (error) { console.error("Error updating storage location:", error.message); return false }
  return true
}

export async function deleteStorageLocation(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("storage_locations").delete().eq("id", id)
  if (error) { console.error("Error deleting storage location:", error.message); return false }
  return true
}

// ─── CSV Export Functions ──────────────────────────────���─────────

export async function exportStocksToCSV(tenantId: string): Promise<{ headers: string[]; data: any[][] }> {
  const [rawMaterials, finishedProducts, packaging] = await Promise.all([
    fetchRawMaterials(tenantId),
    fetchFinishedProducts(tenantId),
    fetchPackaging(tenantId),
  ])

  const headers = [
    "Type",
    "Nom",
    "Catégorie",
    "Stock Actuel",
    "Unité",
    "Stock Minimum",
    "Prix Unitaire",
    "Fournisseur",
    "Date Création",
  ]

  const data: any[][] = []

  // Add raw materials
  rawMaterials.forEach((rm) => {
    data.push([
      "Matière Première",
      rm.name || "N/A",
      "",
      rm.currentStock ?? 0,
      rm.unit || "unité",
      rm.minStock ?? 0,
      (rm.pricePerUnit ?? 0).toFixed(2),
      rm.supplier || "",
      new Date(rm.createdAt).toLocaleDateString("fr-FR"),
    ])
  })

  // Add finished products
  finishedProducts.forEach((fp) => {
    data.push([
      "Produit Fini",
      fp.name || "N/A",
      "",
      fp.currentStock ?? 0,
      fp.unit || "unité",
      fp.minStock ?? 0,
      (fp.sellingPrice ?? 0).toFixed(2),
      "",
      new Date(fp.createdAt).toLocaleDateString("fr-FR"),
    ])
  })

  // Add packaging
  packaging.forEach((pkg) => {
    data.push([
      "Emballage",
      pkg.name || "N/A",
      "",
      pkg.currentStock ?? 0,
      pkg.unit || "unité",
      pkg.minStock ?? 0,
      (pkg.pricePerUnit ?? 0).toFixed(2),
      "",
      new Date(pkg.createdAt).toLocaleDateString("fr-FR"),
    ])
  })

  return { headers, data }
}

export async function getPrintableStocksReport(tenantId: string): Promise<{
  title: string
  subtitle: string
  headers: string[]
  data: any[][]
  totals: Record<string, string | number>
}> {
  try {
    const [rawMaterials, finishedProducts, packaging] = await Promise.all([
      fetchRawMaterials(tenantId),
      fetchFinishedProducts(tenantId),
      fetchPackaging(tenantId),
    ])

    const headers = [
      "Type",
      "Nom",
      "Stock Actuel",
      "Unité",
      "Stock Minimum",
      "Prix Unitaire",
      "Valeur Stock",
      "Statut",
    ]

    const data: any[][] = []
    let totalValue = 0
    let lowStockCount = 0

    // Add raw materials
    rawMaterials.forEach((rm) => {
      const price = rm.pricePerUnit ?? 0
      const value = (rm.currentStock ?? 0) * price
      totalValue += value
      const isLowStock = (rm.currentStock ?? 0) <= (rm.minStock ?? 0)
      if (isLowStock) lowStockCount++

      data.push([
        "Matière Première",
        rm.name || "N/A",
        rm.currentStock ?? 0,
        rm.unit || "unité",
        rm.minStock ?? 0,
        `${price.toFixed(2)} TND`,
        `${value.toFixed(2)} TND`,
        isLowStock ? "⚠️ Stock bas" : "✓ OK",
      ])
    })

    // Add finished products
    finishedProducts.forEach((fp) => {
      const price = fp.sellingPrice ?? 0
      const value = (fp.currentStock ?? 0) * price
      totalValue += value
      const isLowStock = (fp.currentStock ?? 0) <= (fp.minStock ?? 0)
      if (isLowStock) lowStockCount++

      data.push([
        "Produit Fini",
        fp.name || "N/A",
        fp.currentStock ?? 0,
        fp.unit || "unité",
        fp.minStock ?? 0,
        `${price.toFixed(2)} TND`,
        `${value.toFixed(2)} TND`,
        isLowStock ? "⚠️ Stock bas" : "✓ OK",
      ])
    })

    // Add packaging
    packaging.forEach((pkg) => {
      const price = pkg.pricePerUnit ?? 0
      const value = (pkg.currentStock ?? 0) * price
      totalValue += value
      const isLowStock = (pkg.currentStock ?? 0) <= (pkg.minStock ?? 0)
      if (isLowStock) lowStockCount++

      data.push([
        "Emballage",
        pkg.name || "N/A",
        pkg.currentStock ?? 0,
        pkg.unit || "unité",
        pkg.minStock ?? 0,
        `${price.toFixed(2)} TND`,
        `${value.toFixed(2)} TND`,
        isLowStock ? "⚠️ Stock bas" : "✓ OK",
      ])
    })

    return {
      title: "Rapport d'Inventaire des Stocks",
      subtitle: `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
      headers,
      data,
      totals: {
        "Total d'Articles": rawMaterials.length + finishedProducts.length + packaging.length,
        "Valeur Totale du Stock": `${totalValue.toFixed(2)} TND`,
        "Articles en Rupture": lowStockCount,
        "Articles OK": data.length - lowStockCount,
      },
    }
  } catch (error) {
    throw error
  }
}

// ─── Stock Movements ──────────────────────────────────────────

export async function fetchStockMovements(tenantId: string, limit = 50): Promise<StockMovement[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) { console.error("Error fetching stock movements:", error.message); return [] }
  return (data || []).map((m) => ({
    id: m.id, tenantId: m.tenant_id, itemType: m.item_type,
    rawMaterialId: m.raw_material_id, finishedProductId: m.finished_product_id,
    movementType: m.movement_type, quantity: Number(m.quantity), unit: m.unit,
    reason: m.reason, reference: m.reference, createdAt: m.created_at,
  }))
}

export async function createStockMovement(tenantId: string, data: {
  itemType: string; rawMaterialId?: string; finishedProductId?: string; packagingId?: string;
  movementType: string; quantity: number; unit: string; reason?: string; reference?: string;
  fromLocationId?: string; toLocationId?: string;
}): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Normalize movement type for database - map French to database values
  // DB CHECK constraint accepts: entry, exit, transfer, adjustment, production_in, production_out
  const movementTypeMap: Record<string, string> = {
    "entree": "entry",
    "sortie": "exit", 
    "transfert": "transfer"
  }
  const normalizedMovementType = movementTypeMap[data.movementType] || data.movementType

  // Determine table and item id
  let table: string
  let idField: string | undefined
  if (data.itemType === "raw_material") {
    table = "raw_materials"; idField = data.rawMaterialId
  } else if (data.itemType === "packaging") {
    table = "packaging"; idField = data.packagingId
  } else {
    table = "finished_products"; idField = data.finishedProductId
  }

  // 1. Read current stock ONCE before any mutation
  let currentStock = 0
  if (idField) {
    const { data: currentItem } = await supabase.from(table).select("current_stock").eq("id", idField).single()
    currentStock = Number(currentItem?.current_stock || 0)
  }

  // 2. Verify stock is sufficient BEFORE inserting anything (exit/transfer)
  if (idField && (normalizedMovementType === "exit" || normalizedMovementType === "transfer")) {
    if (data.quantity > currentStock) {
      throw new Error(`STOCK_INSUFFISANT:Stock insuffisant. Disponible: ${currentStock} ${data.unit}, demande: ${data.quantity} ${data.unit}`)
    }
  }

  // 3. Insert the stock movement record
  const { error } = await supabase.from("stock_movements").insert({
    tenant_id: tenantId, item_type: data.itemType,
    raw_material_id: data.rawMaterialId || null,
    finished_product_id: data.finishedProductId || null,
    packaging_id: data.packagingId || null,
    movement_type: normalizedMovementType, quantity: data.quantity, unit: data.unit,
    reason: data.reason || null, reference: data.reference || null,
    from_location_id: data.fromLocationId || null,
    to_location_id: data.toLocationId || null,
    created_by: user?.id || null,
  })
  if (error) { throw new Error(error.message) }

  // 4. Update stock level using the already-read value (transfers don't change total stock)
  if (idField && normalizedMovementType !== "transfer") {
    const delta = normalizedMovementType === "entry" ? data.quantity : -data.quantity
    const newStock = currentStock + delta
    if (newStock < 0) {
      throw new Error(`STOCK_INSUFFISANT:Stock insuffisant. Disponible: ${currentStock} ${data.unit}`)
    }
    await supabase.from(table).update({ current_stock: newStock }).eq("id", idField)
  }

  return true
}
