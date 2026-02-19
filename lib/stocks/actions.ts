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
  // Verify auth session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { throw new Error("Session expiree - veuillez vous reconnecter") }
  // Check for duplicate raw material by name
  const { data: existing } = await supabase
    .from("raw_materials").select("id, name").eq("tenant_id", tenantId)
    .ilike("name", data.name.trim()).limit(1)
  if (existing && existing.length > 0) {
    throw new Error(`DUPLICATE:La matiere premiere "${existing[0].name}" existe deja`)
  }
  const { data: row, error } = await supabase.from("raw_materials").insert({
    tenant_id: tenantId, name: data.name, unit: data.unit,
    current_stock: data.currentStock, min_stock: data.minStock,
    price_per_unit: data.pricePerUnit, supplier: data.supplier || null,
  }).select().single()
  if (error) { throw new Error(error.message) }
  if (!row) { throw new Error("Aucune donnee retournee apres insertion") }
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

// ─── Inventory ────────────────────────────────────────────────

export interface InventoryCountItem {
  id: string; name: string; type: "mp" | "pf"
  theoreticalQty: number; physicalQty: number; unit: string; note: string
}

export async function saveInventorySession(tenantId: string, counts: InventoryCountItem[]): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
        movement_type: delta > 0 ? "entree" : "sortie",
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
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")
  if (error) { console.error("Error fetching finished products:", error.message); return [] }
  return (data || []).map((p) => ({
    id: p.id, tenantId: p.tenant_id, categoryId: p.category_id, name: p.name,
    description: p.description, unit: p.unit, currentStock: Number(p.current_stock),
    minStock: Number(p.min_stock), sellingPrice: Number(p.selling_price),
    costPrice: Number(p.cost_price), imageUrl: p.image_url, weight: p.weight,
    isPublished: p.is_published, minOrder: p.min_order, tags: p.tags || [], createdAt: p.created_at,
  }))
}

export async function createFinishedProduct(tenantId: string, data: {
  name: string; categoryId?: string; unit: string; currentStock: number; minStock: number;
  sellingPrice: number; costPrice: number; description?: string; weight?: string
}): Promise<FinishedProduct | null> {
  const supabase = createClient()
  // Check for duplicate finished product by name
  const { data: existing } = await supabase
    .from("finished_products").select("id, name").eq("tenant_id", tenantId)
    .ilike("name", data.name.trim()).limit(1)
  if (existing && existing.length > 0) {
    throw new Error(`DUPLICATE:Le produit fini "${existing[0].name}" existe deja`)
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
  // Check for duplicate packaging by name + type
  const { data: existing } = await supabase
    .from("packaging").select("id, name, type").eq("tenant_id", tenantId)
    .ilike("name", data.name.trim()).eq("type", data.type).limit(1)
  if (existing && existing.length > 0) {
    throw new Error(`DUPLICATE:L'emballage "${existing[0].name}" (${existing[0].type}) existe deja`)
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

  const { error } = await supabase.from("stock_movements").insert({
    tenant_id: tenantId, item_type: data.itemType,
    raw_material_id: data.rawMaterialId || null,
    finished_product_id: data.finishedProductId || null,
    packaging_id: data.packagingId || null,
    movement_type: data.movementType, quantity: data.quantity, unit: data.unit,
    reason: data.reason || null, reference: data.reference || null,
    from_location_id: data.fromLocationId || null,
    to_location_id: data.toLocationId || null,
    created_by: user?.id || null,
  })
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

  // For sortie and transfert: verify stock is sufficient BEFORE inserting movement
  if (idField && (data.movementType === "sortie" || data.movementType === "transfert")) {
    const { data: currentItem } = await supabase.from(table).select("current_stock").eq("id", idField).single()
    const currentStock = Number(currentItem?.current_stock || 0)
    if (data.quantity > currentStock) {
      throw new Error(`STOCK_INSUFFISANT:Stock insuffisant. Disponible: ${currentStock} ${data.unit}, demande: ${data.quantity} ${data.unit}`)
    }
  }

  if (error) { throw new Error(error.message) }

  // Update stock level (transfers don't change total stock)
  if (idField && data.movementType !== "transfert") {
    const { data: currentItem } = await supabase.from(table).select("current_stock").eq("id", idField).single()
    const currentStock = Number(currentItem?.current_stock || 0)
    const delta = data.movementType === "entree" ? data.quantity : -data.quantity
    const newStock = currentStock + delta
    if (newStock < 0) {
      throw new Error(`STOCK_INSUFFISANT:Stock insuffisant. Disponible: ${currentStock} ${data.unit}`)
    }
    await supabase.from(table).update({ current_stock: newStock }).eq("id", idField)
  }

  return true
}
