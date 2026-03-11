"use server"

import { createClient } from "@/lib/supabase/server"

export interface DeliveryCompany {
  id: string
  tenantId: string
  name: string
  contactPhone: string | null
  email: string | null
  website: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── Fetch Delivery Companies ────────────────────────────────────────────
export async function fetchDeliveryCompanies(tenantId: string): Promise<DeliveryCompany[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("delivery_companies")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching delivery companies:", error.message)
    return []
  }

  return (data || []).map((c) => ({
    id: c.id,
    tenantId: c.tenant_id,
    name: c.name,
    contactPhone: c.contact_phone,
    email: c.email,
    website: c.website,
    notes: c.notes,
    isActive: c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }))
}

// ─── Fetch Active Delivery Companies (for dropdowns) ────────────────────────
export async function fetchActiveDeliveryCompanies(tenantId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("delivery_companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching active delivery companies:", error.message)
    return []
  }

  return data || []
}

// ─── Create Delivery Company ────────────────────────────────────────────
export async function createDeliveryCompany(
  tenantId: string,
  data: {
    name: string
    contactPhone?: string | null
    email?: string | null
    website?: string | null
    notes?: string | null
  }
): Promise<DeliveryCompany | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from("delivery_companies")
    .insert({
      tenant_id: tenantId,
      name: data.name.trim(),
      contact_phone: data.contactPhone || null,
      email: data.email || null,
      website: data.website || null,
      notes: data.notes || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating delivery company:", error.message)
    return null
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    contactPhone: row.contact_phone,
    email: row.email,
    website: row.website,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Update Delivery Company ────────────────────────────────────────────
export async function updateDeliveryCompany(
  companyId: string,
  tenantId: string,
  data: {
    name?: string
    contactPhone?: string | null
    email?: string | null
    website?: string | null
    notes?: string | null
    isActive?: boolean
  }
): Promise<boolean> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone
  if (data.email !== undefined) updateData.email = data.email
  if (data.website !== undefined) updateData.website = data.website
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.isActive !== undefined) updateData.is_active = data.isActive

  const { error } = await supabase
    .from("delivery_companies")
    .update(updateData)
    .eq("id", companyId)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Error updating delivery company:", error.message)
    return false
  }

  return true
}

// ─── Delete Delivery Company ────────────────────────────────────────────
export async function deleteDeliveryCompany(companyId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Check if this company is used in any orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("courier", companyId)
    .limit(1)

  if (orders && orders.length > 0) {
    // Instead of deleting, deactivate
    const { error } = await supabase
      .from("delivery_companies")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", companyId)
      .eq("tenant_id", tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: "Societe desactivee (utilisee dans des commandes)" }
  }

  // Delete if not used
  const { error } = await supabase
    .from("delivery_companies")
    .delete()
    .eq("id", companyId)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Error deleting delivery company:", error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ─── Toggle Delivery Company Status ────────────────────────────────────────────
export async function toggleDeliveryCompanyStatus(companyId: string, tenantId: string, isActive: boolean): Promise<boolean> {
  return updateDeliveryCompany(companyId, tenantId, { isActive })
}
