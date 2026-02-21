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

export async function updatePurchaseOrderStatus(id: string, status: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")
  const { error } = await supabase.from("purchase_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) { console.error("Error updating PO status:", error.message); return false }
  return true
}
