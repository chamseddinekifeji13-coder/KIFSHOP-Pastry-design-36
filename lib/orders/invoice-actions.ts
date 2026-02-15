import { createClient } from "@/lib/supabase/client"
import type { Order } from "./actions"

// ─── Types ────────────────────────────────────────────────────

export type DocumentType = "invoice" | "delivery_note"

export interface InvoiceSettings {
  id: string
  tenantId: string
  taxEnabled: boolean
  taxRate: number
  taxLabel: string
  invoicePrefix: string
  deliveryNotePrefix: string
  invoiceCounter: number
  deliveryNoteCounter: number
  footerText: string
  showPricesOnDeliveryNote: boolean
}

export interface InvoiceItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Invoice {
  id: string
  tenantId: string
  orderId: string
  documentNumber: string
  type: DocumentType
  status: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  shippingCost: number
  customerName: string
  customerPhone: string
  customerAddress: string
  deliveryAddress: string
  carrier: string
  notes: string
  footerText: string
  tenantName: string
  tenantAddress: string
  tenantPhone: string
  tenantEmail: string
  tenantFiscalId: string
  tenantLogoUrl: string
  items: InvoiceItem[]
  issuedAt: string
  issuedByName: string
  createdAt: string
}

const defaultSettings: Omit<InvoiceSettings, "id" | "tenantId"> = {
  taxEnabled: false,
  taxRate: 19,
  taxLabel: "TVA",
  invoicePrefix: "FAC",
  deliveryNotePrefix: "BL",
  invoiceCounter: 0,
  deliveryNoteCounter: 0,
  footerText: "Merci pour votre confiance.",
  showPricesOnDeliveryNote: true,
}

// ─── Invoice Settings ─────────────────────────────────────────

export async function getInvoiceSettings(tenantId: string): Promise<InvoiceSettings> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("invoice_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single()

  if (error || !data) {
    // Return defaults if no settings exist
    return {
      id: "",
      tenantId,
      ...defaultSettings,
    }
  }

  return {
    id: data.id,
    tenantId: data.tenant_id,
    taxEnabled: data.tax_enabled,
    taxRate: Number(data.tax_rate),
    taxLabel: data.tax_label,
    invoicePrefix: data.invoice_prefix,
    deliveryNotePrefix: data.delivery_note_prefix,
    invoiceCounter: data.invoice_counter,
    deliveryNoteCounter: data.delivery_note_counter,
    footerText: data.footer_text,
    showPricesOnDeliveryNote: data.show_prices_on_delivery_note,
  }
}

export async function saveInvoiceSettings(
  tenantId: string,
  settings: Partial<Omit<InvoiceSettings, "id" | "tenantId">>
): Promise<boolean> {
  const supabase = createClient()

  const dbData: Record<string, unknown> = {
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  }

  if (settings.taxEnabled !== undefined) dbData.tax_enabled = settings.taxEnabled
  if (settings.taxRate !== undefined) dbData.tax_rate = settings.taxRate
  if (settings.taxLabel !== undefined) dbData.tax_label = settings.taxLabel
  if (settings.invoicePrefix !== undefined) dbData.invoice_prefix = settings.invoicePrefix
  if (settings.deliveryNotePrefix !== undefined) dbData.delivery_note_prefix = settings.deliveryNotePrefix
  if (settings.footerText !== undefined) dbData.footer_text = settings.footerText
  if (settings.showPricesOnDeliveryNote !== undefined) dbData.show_prices_on_delivery_note = settings.showPricesOnDeliveryNote

  // Upsert - insert or update if tenant_id already exists
  const { error } = await supabase
    .from("invoice_settings")
    .upsert(dbData, { onConflict: "tenant_id" })

  if (error) {
    console.error("Error saving invoice settings:", error.message)
    return false
  }

  return true
}

// ─── Generate Document Number ─────────────────────────────────

async function generateDocumentNumber(
  tenantId: string,
  type: DocumentType
): Promise<string> {
  const supabase = createClient()
  const settings = await getInvoiceSettings(tenantId)

  const year = new Date().getFullYear()
  const isInvoice = type === "invoice"
  const prefix = isInvoice ? settings.invoicePrefix : settings.deliveryNotePrefix
  const counterField = isInvoice ? "invoice_counter" : "delivery_note_counter"
  const currentCount = isInvoice ? settings.invoiceCounter : settings.deliveryNoteCounter

  const newCount = currentCount + 1

  // Update counter
  if (settings.id) {
    await supabase
      .from("invoice_settings")
      .update({ [counterField]: newCount, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
  } else {
    // Create settings row if it doesn't exist
    await supabase
      .from("invoice_settings")
      .insert({
        tenant_id: tenantId,
        [counterField]: newCount,
      })
  }

  return `${prefix}-${year}-${String(newCount).padStart(4, "0")}`
}

// ─── Fetch Invoices ───────────────────────────────────────────

export async function fetchInvoices(tenantId: string): Promise<Invoice[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching invoices:", error.message)
    return []
  }

  return (data || []).map(mapInvoice)
}

export async function getOrderInvoices(orderId: string): Promise<Invoice[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching order invoices:", error.message)
    return []
  }

  return (data || []).map(mapInvoice)
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single()

  if (error || !data) {
    console.error("Error fetching invoice:", error?.message)
    return null
  }

  return mapInvoice(data)
}

// ─── Generate Invoice / Delivery Note ─────────────────────────

export async function generateDocument(
  order: Order,
  tenantId: string,
  type: DocumentType
): Promise<Invoice | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get tenant info for snapshot
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, address, phone, email, fiscal_id, logo_url")
    .eq("id", tenantId)
    .single()

  if (!tenant) {
    console.error("Tenant not found")
    return null
  }

  // Get invoice settings for tax calculation
  const settings = await getInvoiceSettings(tenantId)

  // Generate document number
  const documentNumber = await generateDocumentNumber(tenantId, type)

  // Build items snapshot
  const items: InvoiceItem[] = order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: item.quantity * item.price,
  }))

  const itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const shippingCost = order.shippingCost || 0

  // Tax calculation
  let subtotal = itemsSubtotal + shippingCost
  let taxAmount = 0
  let total = subtotal

  if (settings.taxEnabled && type === "invoice") {
    // If tax enabled, the stored total is TTC, we need to calculate HT
    const rate = settings.taxRate / 100
    subtotal = total / (1 + rate)
    taxAmount = total - subtotal
    // Keep the original total as TTC
    total = itemsSubtotal + shippingCost
    subtotal = total / (1 + rate)
    taxAmount = total - subtotal
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenantId,
      order_id: order.id,
      document_number: documentNumber,
      type,
      status: "issued",
      subtotal: settings.taxEnabled && type === "invoice" ? subtotal : itemsSubtotal + shippingCost,
      tax_rate: settings.taxEnabled && type === "invoice" ? settings.taxRate : 0,
      tax_amount: taxAmount,
      total: itemsSubtotal + shippingCost,
      shipping_cost: shippingCost,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      customer_address: order.customerAddress || "",
      delivery_address: order.deliveryAddress || "",
      carrier: order.courier || "",
      notes: order.notes || "",
      footer_text: settings.footerText,
      tenant_name: tenant.name,
      tenant_address: tenant.address || "",
      tenant_phone: tenant.phone || "",
      tenant_email: tenant.email || "",
      tenant_fiscal_id: tenant.fiscal_id || "",
      tenant_logo_url: tenant.logo_url || "",
      items_snapshot: items,
      issued_by: user?.id || null,
      issued_by_name: user?.user_metadata?.display_name || user?.email || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error generating document:", error.message)
    return null
  }

  return mapInvoice(data)
}

// ─── Helper ───────────────────────────────────────────────────

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    orderId: row.order_id as string,
    documentNumber: row.document_number as string,
    type: row.type as DocumentType,
    status: row.status as string,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    shippingCost: Number(row.shipping_cost),
    customerName: (row.customer_name as string) || "",
    customerPhone: (row.customer_phone as string) || "",
    customerAddress: (row.customer_address as string) || "",
    deliveryAddress: (row.delivery_address as string) || "",
    carrier: (row.carrier as string) || "",
    notes: (row.notes as string) || "",
    footerText: (row.footer_text as string) || "",
    tenantName: (row.tenant_name as string) || "",
    tenantAddress: (row.tenant_address as string) || "",
    tenantPhone: (row.tenant_phone as string) || "",
    tenantEmail: (row.tenant_email as string) || "",
    tenantFiscalId: (row.tenant_fiscal_id as string) || "",
    tenantLogoUrl: (row.tenant_logo_url as string) || "",
    items: (row.items_snapshot as InvoiceItem[]) || [],
    issuedAt: row.issued_at as string,
    issuedByName: (row.issued_by_name as string) || "",
    createdAt: row.created_at as string,
  }
}
