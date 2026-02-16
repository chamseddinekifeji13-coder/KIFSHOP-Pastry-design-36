import { createClient } from "@/lib/supabase/client"

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
  imageUrl: string | null
  weight: string | null
  isPublished: boolean
  minOrder: number
  tags: string[]
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
    createdAt: r.created_at,
  }))
}

export async function createRawMaterial(tenantId: string, data: {
  name: string; unit: string; currentStock: number; minStock: number; pricePerUnit: number; supplier?: string
}): Promise<RawMaterial | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("raw_materials").insert({
    tenant_id: tenantId, name: data.name, unit: data.unit,
    current_stock: data.currentStock, min_stock: data.minStock,
    price_per_unit: data.pricePerUnit, supplier: data.supplier || null,
  }).select().single()
  if (error || !row) { console.error("Error creating raw material:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, name: row.name, unit: row.unit,
    currentStock: Number(row.current_stock), minStock: Number(row.min_stock),
    pricePerUnit: Number(row.price_per_unit), supplier: row.supplier, createdAt: row.created_at }
}

export async function updateRawMaterial(id: string, data: Partial<{
  name: string; unit: string; currentStock: number; minStock: number; pricePerUnit: number; supplier: string
}>): Promise<boolean> {
  const supabase = createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updates.name = data.name
  if (data.unit !== undefined) updates.unit = data.unit
  if (data.currentStock !== undefined) updates.current_stock = data.currentStock
  if (data.minStock !== undefined) updates.min_stock = data.minStock
  if (data.pricePerUnit !== undefined) updates.price_per_unit = data.pricePerUnit
  if (data.supplier !== undefined) updates.supplier = data.supplier
  const { error } = await supabase.from("raw_materials").update(updates).eq("id", id)
  if (error) { console.error("Error updating raw material:", error.message); return false }
  return true
}

export async function deleteRawMaterial(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("raw_materials").delete().eq("id", id)
  if (error) { console.error("Error deleting raw material:", error.message); return false }
  return true
}

// ─── Finished Products ────────────────────────────────────────

export async function fetchFinishedProducts(tenantId: string): Promise<FinishedProduct[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("finished_products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")

  if (error) { console.error("Error fetching finished products:", error.message); return [] }
  return (data || []).map((p) => ({
    id: p.id, tenantId: p.tenant_id, categoryId: p.category_id, name: p.name,
    description: p.description, unit: p.unit, currentStock: Number(p.current_stock),
    minStock: Number(p.min_stock), sellingPrice: Number(p.selling_price),
    costPrice: Number(p.cost_price), imageUrl: p.image_url, weight: p.weight,
    isPublished: p.is_published, minOrder: p.min_order, tags: p.tags || [],
    createdAt: p.created_at,
  }))
}

export async function createFinishedProduct(tenantId: string, data: {
  name: string; categoryId?: string; unit: string; currentStock: number; minStock: number;
  sellingPrice: number; costPrice: number; description?: string; weight?: string
}): Promise<FinishedProduct | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("finished_products").insert({
    tenant_id: tenantId, name: data.name, category_id: data.categoryId || null,
    unit: data.unit, current_stock: data.currentStock, min_stock: data.minStock,
    selling_price: data.sellingPrice, cost_price: data.costPrice,
    description: data.description || null, weight: data.weight || null,
  }).select().single()
  if (error || !row) { console.error("Error creating finished product:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, categoryId: row.category_id, name: row.name,
    description: row.description, unit: row.unit, currentStock: Number(row.current_stock),
    minStock: Number(row.min_stock), sellingPrice: Number(row.selling_price),
    costPrice: Number(row.cost_price), imageUrl: row.image_url, weight: row.weight,
    isPublished: row.is_published, minOrder: row.min_order, tags: row.tags || [], createdAt: row.created_at }
}

// Alias for backward compatibility
export const addFinishedProduct = createFinishedProduct

// ─── Recipes ──────────────────────────────────────────────────

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
  const { data: row, error } = await supabase.from("packaging").insert({
    tenant_id: tenantId, name: data.name, type: data.type, unit: data.unit,
    current_stock: data.currentStock, min_stock: data.minStock,
    price: data.price, description: data.description || null,
  }).select().single()
  if (error || !row) { console.error("Error creating packaging:", error?.message); return null }
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
  itemType: string; rawMaterialId?: string; finishedProductId?: string;
  movementType: string; quantity: number; unit: string; reason?: string; reference?: string
}): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from("stock_movements").insert({
    tenant_id: tenantId, item_type: data.itemType,
    raw_material_id: data.rawMaterialId || null, finished_product_id: data.finishedProductId || null,
    movement_type: data.movementType, quantity: data.quantity, unit: data.unit,
    reason: data.reason || null, reference: data.reference || null, created_by: user?.id || null,
  })
  if (error) { console.error("Error creating stock movement:", error.message); return false }

  // Update stock level
  const table = data.itemType === "raw_material" ? "raw_materials" : "finished_products"
  const idField = data.itemType === "raw_material" ? data.rawMaterialId : data.finishedProductId
  if (idField) {
    const { data: item } = await supabase.from(table).select("current_stock").eq("id", idField).single()
    const currentStock = Number(item?.current_stock || 0)
    const delta = data.movementType === "entree" ? data.quantity : -data.quantity
    await supabase.from(table).update({ current_stock: Math.max(0, currentStock + delta) }).eq("id", idField)
  }

  return true
}
