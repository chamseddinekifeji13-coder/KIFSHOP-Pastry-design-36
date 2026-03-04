import { createClient } from "@/lib/supabase/client"

export interface Supplier {
  id: string
  tenantId: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  products: string[]
  status: string
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  tenantId: string
  supplierId: string | null
  supplierName: string
  status: string
  total: number
  expectedDelivery: string | null
  notes: string | null
  items: PurchaseOrderItem[]
  createdAt: string
}

export interface PurchaseOrderItem {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

// ─── Suppliers ────────────────────────────────────────────────

export async function fetchSuppliers(tenantId: string): Promise<Supplier[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name")
  if (error) { console.error("Error fetching suppliers:", error.message); return [] }
  return (data || []).map((s) => ({
    id: s.id, tenantId: s.tenant_id, name: s.name, contactName: s.contact_name,
    phone: s.phone, email: s.email, products: s.products || [], status: s.status,
    createdAt: s.created_at,
  }))
}

export async function createSupplier(tenantId: string, data: {
  name: string; contactName?: string; phone?: string; email?: string; products?: string[]
}): Promise<Supplier | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")
  // Check for duplicate supplier by name
  const { data: existing } = await supabase
    .from("suppliers").select("id, name").eq("tenant_id", tenantId)
    .ilike("name", data.name.trim()).limit(1)
  if (existing && existing.length > 0) {
    throw new Error(`DUPLICATE:Le fournisseur "${existing[0].name}" existe deja`)
  }
  // Check for duplicate supplier by phone
  if (data.phone) {
    const { data: phoneMatch } = await supabase
      .from("suppliers").select("id, name, phone").eq("tenant_id", tenantId)
      .eq("phone", data.phone.trim()).limit(1)
    if (phoneMatch && phoneMatch.length > 0) {
      throw new Error(`DUPLICATE:Un fournisseur avec ce numero existe deja: "${phoneMatch[0].name}"`)
    }
  }
  const { data: row, error } = await supabase.from("suppliers").insert({
    tenant_id: tenantId, name: data.name, contact_name: data.contactName || null,
    phone: data.phone || null, email: data.email || null, products: data.products || [],
  }).select().single()
  if (error || !row) { console.error("Error creating supplier:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, name: row.name, contactName: row.contact_name,
    phone: row.phone, email: row.email, products: row.products || [], status: row.status, createdAt: row.created_at }
}

export async function updateSupplier(supplierId: string, tenantId: string, data: {
  name: string; contactName?: string; phone?: string; email?: string; products?: string[]; status?: string
}): Promise<Supplier | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  // Check for duplicate name (excluding self)
  const { data: existing } = await supabase
    .from("suppliers").select("id, name").eq("tenant_id", tenantId)
    .ilike("name", data.name.trim()).neq("id", supplierId).limit(1)
  if (existing && existing.length > 0) {
    throw new Error(`DUPLICATE:Le fournisseur "${existing[0].name}" existe deja`)
  }

  // Check for duplicate phone (excluding self)
  if (data.phone) {
    const { data: phoneMatch } = await supabase
      .from("suppliers").select("id, name, phone").eq("tenant_id", tenantId)
      .eq("phone", data.phone.trim()).neq("id", supplierId).limit(1)
    if (phoneMatch && phoneMatch.length > 0) {
      throw new Error(`DUPLICATE:Un fournisseur avec ce numero existe deja: "${phoneMatch[0].name}"`)
    }
  }

  const { data: row, error } = await supabase.from("suppliers").update({
    name: data.name, contact_name: data.contactName || null,
    phone: data.phone || null, email: data.email || null,
    products: data.products || [], status: data.status || "active",
  }).eq("id", supplierId).eq("tenant_id", tenantId).select().single()

  if (error || !row) { console.error("Error updating supplier:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, name: row.name, contactName: row.contact_name,
    phone: row.phone, email: row.email, products: row.products || [], status: row.status, createdAt: row.created_at }
}

export async function deleteSupplier(supplierId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("suppliers")
    .delete().eq("id", supplierId).eq("tenant_id", tenantId)
  if (error) { console.error("Error deleting supplier:", error.message); return false }
  return true
}

// ─── Purchase Orders ──────────────────────────────────────────

export async function fetchPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
  const supabase = createClient()
  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) { console.error("Error fetching purchase orders:", error.message); return [] }
  if (!orders || orders.length === 0) return []

  const orderIds = orders.map((o) => o.id)
  const { data: allItems } = await supabase
    .from("purchase_order_items")
    .select("*")
    .in("purchase_order_id", orderIds)

  const itemsByOrder = new Map<string, PurchaseOrderItem[]>()
  allItems?.forEach((item) => {
    const list = itemsByOrder.get(item.purchase_order_id) || []
    list.push({ id: item.id, name: item.name, quantity: Number(item.quantity), unit: item.unit, unitPrice: Number(item.unit_price) })
    itemsByOrder.set(item.purchase_order_id, list)
  })

  return orders.map((o) => ({
    id: o.id, tenantId: o.tenant_id, supplierId: o.supplier_id, supplierName: o.supplier_name,
    status: o.status, total: Number(o.total), expectedDelivery: o.expected_delivery,
    notes: o.notes, items: itemsByOrder.get(o.id) || [], createdAt: o.created_at,
  }))
}

export async function createPurchaseOrder(tenantId: string, data: {
  supplierId?: string; supplierName: string; expectedDelivery?: string; notes?: string;
  items: { name: string; quantity: number; unit: string; unitPrice: number }[]
}): Promise<PurchaseOrder | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")
  const total = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  const { data: row, error } = await supabase.from("purchase_orders").insert({
    tenant_id: tenantId, supplier_id: data.supplierId || null, supplier_name: data.supplierName,
    total, expected_delivery: data.expectedDelivery || null, notes: data.notes || null,
    created_by: user?.id || null,
  }).select().single()
  if (error || !row) { console.error("Error creating purchase order:", error?.message); return null }

  const itemRows = data.items.map((i) => ({
    purchase_order_id: row.id, name: i.name, quantity: i.quantity, unit: i.unit, unit_price: i.unitPrice,
  }))
  await supabase.from("purchase_order_items").insert(itemRows)

  return { id: row.id, tenantId: row.tenant_id, supplierId: row.supplier_id,
    supplierName: row.supplier_name, status: row.status, total: Number(row.total),
    expectedDelivery: row.expected_delivery, notes: row.notes,
    items: data.items.map((i, idx) => ({ id: `new-${idx}`, ...i })), createdAt: row.created_at }
}

// ─── Supplier Price History (RPC) ─────────────────────────────

export interface PriceHistoryEntry {
  id: string
  date: string
  supplierId: string
  supplierName: string
  rawMaterialName: string
  unitPrice: number
  unit: string
  quantity: number
}

export interface BestPriceByProduct {
  rawMaterialName: string
  unit: string
  bestPrice: number
  avgPrice: number
  entriesCount: number
  bestSupplierName: string
  lastPrice: number
  lastSupplierName: string
  priceVariation: number
}

export interface SupplierPriceData {
  entries: PriceHistoryEntry[]
  bestPrices: BestPriceByProduct[]
}

export async function fetchSupplierPriceHistory(tenantId: string): Promise<SupplierPriceData> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("get_supplier_price_history", {
    p_tenant_id: tenantId,
  })
  if (error) {
    console.error("Error fetching supplier price history:", error.message)
    return { entries: [], bestPrices: [] }
  }
  return {
    entries: (data?.entries || []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      date: e.date as string,
      supplierId: e.supplierId as string,
      supplierName: e.supplierName as string,
      rawMaterialName: e.rawMaterialName as string,
      unitPrice: Number(e.unitPrice),
      unit: e.unit as string,
      quantity: Number(e.quantity),
    })),
    bestPrices: (data?.bestPrices || []).map((bp: Record<string, unknown>) => ({
      rawMaterialName: bp.rawMaterialName as string,
      unit: bp.unit as string,
      bestPrice: Number(bp.bestPrice),
      avgPrice: Number(bp.avgPrice),
      entriesCount: Number(bp.entriesCount),
      bestSupplierName: bp.bestSupplierName as string,
      lastPrice: Number(bp.lastPrice),
      lastSupplierName: bp.lastSupplierName as string,
      priceVariation: Number(bp.priceVariation),
    })),
  }
}

// ─── Purchase Invoices (Factures d'achat) ─────────────────────

export interface PurchaseInvoice {
  id: string
  tenantId: string
  invoiceNumber: string
  supplierId: string | null
  supplierName: string
  invoiceDate: string
  dueDate: string | null
  status: string
  totalHt: number
  totalTva: number
  totalTtc: number
  notes: string | null
  validatedBy: string | null
  validatedAt: string | null
  createdBy: string | null
  items: PurchaseInvoiceItem[]
  createdAt: string
}

export interface PurchaseInvoiceItem {
  id: string
  invoiceId: string
  itemType: string
  rawMaterialId: string | null
  packagingId: string | null
  consumableId: string | null
  name: string
  quantity: number
  unit: string
  unitPrice: number
  tvaRate: number
  totalHt: number
  totalTtc: number
}

export async function fetchPurchaseInvoices(tenantId: string): Promise<PurchaseInvoice[]> {
  const supabase = createClient()
  const { data: invoices, error } = await supabase
    .from("purchase_invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) { console.error("Error fetching purchase invoices:", error.message); return [] }
  if (!invoices || invoices.length === 0) return []

  const invoiceIds = invoices.map((i) => i.id)
  const { data: allItems } = await supabase
    .from("purchase_invoice_items")
    .select("*")
    .in("invoice_id", invoiceIds)

  const itemsByInvoice = new Map<string, PurchaseInvoiceItem[]>()
  allItems?.forEach((item) => {
    const list = itemsByInvoice.get(item.invoice_id) || []
    list.push({
      id: item.id, invoiceId: item.invoice_id, itemType: item.item_type,
      rawMaterialId: item.raw_material_id, packagingId: item.packaging_id,
      consumableId: item.consumable_id, name: item.name,
      quantity: Number(item.quantity), unit: item.unit,
      unitPrice: Number(item.unit_price), tvaRate: Number(item.tva_rate),
      totalHt: Number(item.total_ht), totalTtc: Number(item.total_ttc),
    })
    itemsByInvoice.set(item.invoice_id, list)
  })

  return invoices.map((inv) => ({
    id: inv.id, tenantId: inv.tenant_id, invoiceNumber: inv.invoice_number,
    supplierId: inv.supplier_id, supplierName: inv.supplier_name,
    invoiceDate: inv.invoice_date, dueDate: inv.due_date,
    status: inv.status, totalHt: Number(inv.total_ht),
    totalTva: Number(inv.total_tva), totalTtc: Number(inv.total_ttc),
    notes: inv.notes, validatedBy: inv.validated_by,
    validatedAt: inv.validated_at, createdBy: inv.created_by,
    items: itemsByInvoice.get(inv.id) || [], createdAt: inv.created_at,
  }))
}

export async function createPurchaseInvoice(tenantId: string, data: {
  invoiceNumber: string; supplierId?: string; supplierName: string;
  invoiceDate: string; dueDate?: string; notes?: string;
  items: { itemType: string; rawMaterialId?: string; packagingId?: string; consumableId?: string;
    name: string; quantity: number; unit: string; unitPrice: number; tvaRate: number }[]
}): Promise<PurchaseInvoice | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  const items = data.items.map((i) => {
    const totalHt = i.quantity * i.unitPrice
    const totalTtc = totalHt * (1 + i.tvaRate / 100)
    return { ...i, totalHt, totalTtc }
  })
  const totalHt = items.reduce((sum, i) => sum + i.totalHt, 0)
  const totalTtc = items.reduce((sum, i) => sum + i.totalTtc, 0)
  const totalTva = totalTtc - totalHt

  const { data: row, error } = await supabase.from("purchase_invoices").insert({
    tenant_id: tenantId, invoice_number: data.invoiceNumber,
    supplier_id: data.supplierId || null, supplier_name: data.supplierName,
    invoice_date: data.invoiceDate, due_date: data.dueDate || null,
    status: "en-attente", total_ht: totalHt, total_tva: totalTva, total_ttc: totalTtc,
    notes: data.notes || null, created_by: user.id,
  }).select().single()
  if (error || !row) { console.error("Error creating purchase invoice:", error?.message); return null }

  const itemRows = items.map((i) => ({
    invoice_id: row.id, item_type: i.itemType,
    raw_material_id: i.rawMaterialId || null,
    packaging_id: i.packagingId || null,
    consumable_id: i.consumableId || null,
    name: i.name, quantity: i.quantity, unit: i.unit,
    unit_price: i.unitPrice, tva_rate: i.tvaRate,
    total_ht: i.totalHt, total_ttc: i.totalTtc,
  }))
  await supabase.from("purchase_invoice_items").insert(itemRows)

  return {
    id: row.id, tenantId: row.tenant_id, invoiceNumber: row.invoice_number,
    supplierId: row.supplier_id, supplierName: row.supplier_name,
    invoiceDate: row.invoice_date, dueDate: row.due_date,
    status: row.status, totalHt: Number(row.total_ht),
    totalTva: Number(row.total_tva), totalTtc: Number(row.total_ttc),
    notes: row.notes, validatedBy: row.validated_by,
    validatedAt: row.validated_at, createdBy: row.created_by,
    items: items.map((i, idx) => ({ id: `new-${idx}`, invoiceId: row.id, ...i })),
    createdAt: row.created_at,
  }
}

export async function validatePurchaseInvoice(invoiceId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  // Get invoice and its items
  const { data: invoice } = await supabase
    .from("purchase_invoices").select("*").eq("id", invoiceId).single()
  if (!invoice) throw new Error("Facture introuvable")
  if (invoice.status === "validee") throw new Error("Facture deja validee")

  const { data: items } = await supabase
    .from("purchase_invoice_items").select("*").eq("invoice_id", invoiceId)

  if (!items || items.length === 0) throw new Error("Facture sans articles")

  // Helper: upsert stock_by_location for invoice validation
  const upsertInvLocationStock = async (locationId: string, itemType: string, itemId: string, idColumn: string, qty: number) => {
    const { data: existing } = await supabase.from("stock_by_location")
      .select("id, quantity")
      .eq("storage_location_id", locationId)
      .eq("item_type", itemType)
      .eq(idColumn, itemId)
      .maybeSingle()

    if (existing) {
      await supabase.from("stock_by_location").update({
        quantity: Math.max(0, Number(existing.quantity || 0) + qty),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id)
    } else {
      await supabase.from("stock_by_location").insert({
        tenant_id: invoice.tenant_id, storage_location_id: locationId,
        item_type: itemType, [idColumn]: itemId,
        quantity: qty, updated_at: new Date().toISOString(),
      })
    }
  }

  // Update stock and prices for each item
  for (const item of items) {
    const qty = Number(item.quantity)
    const unitPrice = Number(item.unit_price)

    if (item.item_type === "raw_material" && item.raw_material_id) {
      const { data: rm } = await supabase
        .from("raw_materials").select("current_stock, storage_location_id").eq("id", item.raw_material_id).single()
      const newStock = Number(rm?.current_stock || 0) + qty
      await supabase.from("raw_materials").update({
        current_stock: newStock, price_per_unit: unitPrice, updated_at: new Date().toISOString()
      }).eq("id", item.raw_material_id)

      await supabase.from("stock_movements").insert({
        tenant_id: invoice.tenant_id, item_type: "raw_material",
        raw_material_id: item.raw_material_id,
        movement_type: "entry", quantity: qty, unit: item.unit,
        reason: "Facture achat validee", reference: `FAC-${invoice.invoice_number}`,
        to_location_id: rm?.storage_location_id || null,
        created_by: user.id,
      })

      if (rm?.storage_location_id) {
        await upsertInvLocationStock(rm.storage_location_id, "raw_material", item.raw_material_id, "raw_material_id", qty)
      }
    } else if (item.item_type === "packaging" && item.packaging_id) {
      const { data: pkg } = await supabase
        .from("packaging").select("current_stock, storage_location_id").eq("id", item.packaging_id).single()
      const newStock = Number(pkg?.current_stock || 0) + qty
      await supabase.from("packaging").update({
        current_stock: newStock, price: unitPrice, updated_at: new Date().toISOString()
      }).eq("id", item.packaging_id)

      await supabase.from("stock_movements").insert({
        tenant_id: invoice.tenant_id, item_type: "packaging",
        packaging_id: item.packaging_id,
        movement_type: "entry", quantity: qty, unit: item.unit,
        reason: "Facture achat validee", reference: `FAC-${invoice.invoice_number}`,
        to_location_id: pkg?.storage_location_id || null,
        created_by: user.id,
      })

      if (pkg?.storage_location_id) {
        await upsertInvLocationStock(pkg.storage_location_id, "packaging", item.packaging_id, "packaging_id", qty)
      }
    } else if (item.item_type === "consumable" && item.consumable_id) {
      const { data: cons } = await supabase
        .from("consumables").select("current_stock").eq("id", item.consumable_id).single()
      const newStock = Number(cons?.current_stock || 0) + qty
      await supabase.from("consumables").update({
        current_stock: newStock, price: unitPrice, updated_at: new Date().toISOString()
      }).eq("id", item.consumable_id)
    }
  }

  // Mark invoice as validated
  const { error } = await supabase.from("purchase_invoices").update({
    status: "validee", validated_by: user.id,
    validated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", invoiceId)
  if (error) { console.error("Error validating invoice:", error.message); return false }
  return true
}

export async function rejectPurchaseInvoice(invoiceId: string, reason?: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  const { error } = await supabase.from("purchase_invoices").update({
    status: "rejetee", notes: reason || null, updated_at: new Date().toISOString(),
  }).eq("id", invoiceId)
  if (error) { console.error("Error rejecting invoice:", error.message); return false }
  return true
}

// ─── Delivery Notes (Bons de livraison) ──────────────────────

export interface DeliveryNote {
  id: string
  tenantId: string
  deliveryNumber: string
  purchaseOrderId: string | null
  supplierId: string | null
  supplierName: string
  deliveryDate: string
  status: string
  notes: string | null
  validatedBy: string | null
  validatedAt: string | null
  createdBy: string | null
  items: DeliveryNoteItem[]
  createdAt: string
}

export interface DeliveryNoteItem {
  id: string
  deliveryNoteId: string
  itemType: string
  rawMaterialId: string | null
  packagingId: string | null
  consumableId: string | null
  name: string
  quantityOrdered: number
  quantityReceived: number
  unit: string
  isConform: boolean
  remark: string | null
}

export async function fetchDeliveryNotes(tenantId: string): Promise<DeliveryNote[]> {
  const supabase = createClient()
  const { data: notes, error } = await supabase
    .from("delivery_notes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) { console.error("Error fetching delivery notes:", error.message); return [] }
  if (!notes || notes.length === 0) return []

  const noteIds = notes.map((n) => n.id)
  const { data: allItems } = await supabase
    .from("delivery_note_items")
    .select("*")
    .in("delivery_note_id", noteIds)

  const itemsByNote = new Map<string, DeliveryNoteItem[]>()
  allItems?.forEach((item) => {
    const list = itemsByNote.get(item.delivery_note_id) || []
    list.push({
      id: item.id, deliveryNoteId: item.delivery_note_id, itemType: item.item_type,
      rawMaterialId: item.raw_material_id, packagingId: item.packaging_id,
      consumableId: item.consumable_id, name: item.name,
      quantityOrdered: Number(item.quantity_ordered), quantityReceived: Number(item.quantity_received),
      unit: item.unit, isConform: item.is_conform, remark: item.remark,
    })
    itemsByNote.set(item.delivery_note_id, list)
  })

  return notes.map((n) => ({
    id: n.id, tenantId: n.tenant_id, deliveryNumber: n.delivery_number,
    purchaseOrderId: n.purchase_order_id, supplierId: n.supplier_id,
    supplierName: n.supplier_name, deliveryDate: n.delivery_date,
    status: n.status, notes: n.notes,
    validatedBy: n.validated_by, validatedAt: n.validated_at,
    createdBy: n.created_by, items: itemsByNote.get(n.id) || [],
    createdAt: n.created_at,
  }))
}

export async function createDeliveryNote(tenantId: string, data: {
  deliveryNumber: string; purchaseOrderId?: string; supplierId?: string; supplierName: string;
  deliveryDate: string; notes?: string;
  items: { itemType: string; rawMaterialId?: string; packagingId?: string; consumableId?: string;
    name: string; quantityOrdered: number; quantityReceived: number; unit: string; isConform: boolean; remark?: string }[]
}): Promise<DeliveryNote | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  const { data: row, error } = await supabase.from("delivery_notes").insert({
    tenant_id: tenantId, delivery_number: data.deliveryNumber,
    purchase_order_id: data.purchaseOrderId || null,
    supplier_id: data.supplierId || null, supplier_name: data.supplierName,
    delivery_date: data.deliveryDate, status: "en-attente",
    notes: data.notes || null, created_by: user.id,
  }).select().single()
  if (error || !row) { console.error("Error creating delivery note:", error?.message); return null }

  const itemRows = data.items.map((i) => ({
    delivery_note_id: row.id, item_type: i.itemType,
    raw_material_id: i.rawMaterialId || null,
    packaging_id: i.packagingId || null,
    consumable_id: i.consumableId || null,
    name: i.name, quantity_ordered: i.quantityOrdered,
    quantity_received: i.quantityReceived, unit: i.unit,
    is_conform: i.isConform, remark: i.remark || null,
  }))
  await supabase.from("delivery_note_items").insert(itemRows)

  // If linked to a PO, update its status to "en-livraison"
  if (data.purchaseOrderId) {
    await supabase.from("purchase_orders").update({
      status: "en-livraison", updated_at: new Date().toISOString(),
    }).eq("id", data.purchaseOrderId)
  }

  return {
    id: row.id, tenantId: row.tenant_id, deliveryNumber: row.delivery_number,
    purchaseOrderId: row.purchase_order_id, supplierId: row.supplier_id,
    supplierName: row.supplier_name, deliveryDate: row.delivery_date,
    status: row.status, notes: row.notes, validatedBy: row.validated_by,
    validatedAt: row.validated_at, createdBy: row.created_by,
    items: data.items.map((i, idx) => ({ id: `new-${idx}`, deliveryNoteId: row.id, ...i, remark: i.remark || null })),
    createdAt: row.created_at,
  }
}

export async function validateDeliveryNote(deliveryNoteId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  const { data: note } = await supabase
    .from("delivery_notes").select("*").eq("id", deliveryNoteId).single()
  if (!note) throw new Error("Bon de livraison introuvable")
  if (note.status === "validee") throw new Error("Bon deja valide")

  const { data: items } = await supabase
    .from("delivery_note_items").select("*").eq("delivery_note_id", deliveryNoteId)
  if (!items || items.length === 0) throw new Error("Bon sans articles")

  // Helper: upsert stock_by_location for a given location
  const upsertLocationStock = async (locationId: string, itemType: string, itemId: string, idColumn: string, qty: number) => {
    const { data: existing } = await supabase.from("stock_by_location")
      .select("id, quantity")
      .eq("storage_location_id", locationId)
      .eq("item_type", itemType)
      .eq(idColumn, itemId)
      .maybeSingle()

    if (existing) {
      await supabase.from("stock_by_location").update({
        quantity: Math.max(0, Number(existing.quantity || 0) + qty),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id)
    } else {
      await supabase.from("stock_by_location").insert({
        tenant_id: note.tenant_id, storage_location_id: locationId,
        item_type: itemType, [idColumn]: itemId,
        quantity: qty, updated_at: new Date().toISOString(),
      })
    }
  }

  // Update stock for each received item
  for (const item of items) {
    const qty = Number(item.quantity_received)
    if (qty <= 0) continue

    if (item.item_type === "raw_material" && item.raw_material_id) {
      const { data: rm } = await supabase
        .from("raw_materials").select("current_stock, storage_location_id").eq("id", item.raw_material_id).single()
      const newStock = Number(rm?.current_stock || 0) + qty
      await supabase.from("raw_materials").update({
        current_stock: newStock, updated_at: new Date().toISOString()
      }).eq("id", item.raw_material_id)

      await supabase.from("stock_movements").insert({
        tenant_id: note.tenant_id, item_type: "raw_material",
        raw_material_id: item.raw_material_id,
        movement_type: "entry", quantity: qty, unit: item.unit,
        reason: "Bon de livraison valide", reference: `BL-${note.delivery_number}`,
        to_location_id: rm?.storage_location_id || null,
        created_by: user.id,
      })

      // Update stock_by_location if article has a default location
      if (rm?.storage_location_id) {
        await upsertLocationStock(rm.storage_location_id, "raw_material", item.raw_material_id, "raw_material_id", qty)
      }
    } else if (item.item_type === "packaging" && item.packaging_id) {
      const { data: pkg } = await supabase
        .from("packaging").select("current_stock, storage_location_id").eq("id", item.packaging_id).single()
      const newStock = Number(pkg?.current_stock || 0) + qty
      await supabase.from("packaging").update({
        current_stock: newStock, updated_at: new Date().toISOString()
      }).eq("id", item.packaging_id)

      await supabase.from("stock_movements").insert({
        tenant_id: note.tenant_id, item_type: "packaging",
        packaging_id: item.packaging_id,
        movement_type: "entry", quantity: qty, unit: item.unit,
        reason: "Bon de livraison valide", reference: `BL-${note.delivery_number}`,
        to_location_id: pkg?.storage_location_id || null,
        created_by: user.id,
      })

      if (pkg?.storage_location_id) {
        await upsertLocationStock(pkg.storage_location_id, "packaging", item.packaging_id, "packaging_id", qty)
      }
    } else if (item.item_type === "consumable" && item.consumable_id) {
      const { data: cons } = await supabase
        .from("consumables").select("current_stock").eq("id", item.consumable_id).single()
      const newStock = Number(cons?.current_stock || 0) + qty
      await supabase.from("consumables").update({
        current_stock: newStock, updated_at: new Date().toISOString()
      }).eq("id", item.consumable_id)
    }
  }

  // Mark delivery note as validated
  const { error } = await supabase.from("delivery_notes").update({
    status: "validee", validated_by: user.id,
    validated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", deliveryNoteId)

  // If linked to a PO, update its status to "livree"
  if (note.purchase_order_id) {
    await supabase.from("purchase_orders").update({
      status: "livree", updated_at: new Date().toISOString(),
    }).eq("id", note.purchase_order_id)
  }

  if (error) { console.error("Error validating delivery note:", error.message); return false }
  return true
}

export async function rejectDeliveryNote(deliveryNoteId: string, reason?: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  const { error } = await supabase.from("delivery_notes").update({
    status: "rejetee", notes: reason || null, updated_at: new Date().toISOString(),
  }).eq("id", deliveryNoteId)
  if (error) { console.error("Error rejecting delivery note:", error.message); return false }
  return true
}

export async function updatePurchaseOrderStatus(id: string, status: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")
  const { error } = await supabase.from("purchase_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) { console.error("Error updating PO status:", error.message); return false }
  return true
}
