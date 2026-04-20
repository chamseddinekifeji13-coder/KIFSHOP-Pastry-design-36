"use client"

import { createClient } from "@/lib/supabase/client"

export interface Prospect {
  id: string
  tenantId: string
  name: string
  phone: string | null
  source: string
  status: "nouveau" | "contacte" | "en-discussion" | "converti" | "perdu"
  message: string | null
  notes: string | null
  eventType: "fete" | "mariage" | null
  eventDate: string | null
  quoteStatus: "non_demande" | "a_preparer" | "envoye" | "accepte" | "refuse"
  quoteAmount: number | null
  quoteNotes: string | null
  quoteBudget: number | null
  quoteItems: Array<{
    id: string
    category: "pf" | "boisson" | "autre"
    label: string
    unit: "pieces" | "kg" | "litres" | "bouteilles"
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  reminderAt: string | null
  reminderDismissed: boolean
  convertedOrderId: string | null
  createdAt: string
  updatedAt: string
}

function mapRow(r: any): Prospect {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    phone: r.phone,
    source: r.source,
    status: r.status,
    message: r.message,
    notes: r.notes,
    eventType: r.event_type,
    eventDate: r.event_date,
    quoteStatus: r.quote_status || "non_demande",
    quoteAmount: r.quote_amount,
    quoteNotes: r.quote_notes,
    quoteBudget: r.quote_budget,
    quoteItems: Array.isArray(r.quote_items) ? r.quote_items : [],
    reminderAt: r.reminder_at,
    reminderDismissed: r.reminder_dismissed,
    convertedOrderId: r.converted_order_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function fetchProspects(tenantId: string): Promise<Prospect[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) { console.error("Error fetching prospects:", error.message); return [] }
  return (data || []).map(mapRow)
}

export async function fetchDueReminders(tenantId: string): Promise<Prospect[]> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("reminder_dismissed", false)
    .neq("status", "converti")
    .neq("status", "perdu")
    .lte("reminder_at", now)
    .order("reminder_at", { ascending: true })
  if (error) { console.error("Error fetching reminders:", error.message); return [] }
  return (data || []).map(mapRow)
}

export async function createProspect(tenantId: string, data: {
  name: string
  phone?: string
  source: string
  message?: string
  notes?: string
  eventType?: "fete" | "mariage"
  eventDate?: string
  quoteStatus?: "non_demande" | "a_preparer" | "envoye" | "accepte" | "refuse"
  quoteAmount?: number
  quoteNotes?: string
  quoteBudget?: number
  quoteItems?: Array<{
    id: string
    category: "pf" | "boisson" | "autre"
    label: string
    unit: "pieces" | "kg" | "litres" | "bouteilles"
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  reminderAt?: string
}): Promise<Prospect | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("prospects").insert({
    tenant_id: tenantId,
    name: data.name,
    phone: data.phone || null,
    source: data.source,
    message: data.message || null,
    notes: data.notes || null,
    event_type: data.eventType || null,
    event_date: data.eventDate || null,
    quote_status: data.quoteStatus || "non_demande",
    quote_amount: data.quoteAmount ?? null,
    quote_notes: data.quoteNotes || null,
    quote_budget: data.quoteBudget ?? null,
    quote_items: data.quoteItems ?? [],
    reminder_at: data.reminderAt || null,
  }).select().single()
  if (error || !row) { console.error("Error creating prospect:", error?.message); return null }
  return mapRow(row)
}

export async function createProspectsBulk(tenantId: string, prospects: {
  name: string; phone: string; source: string; message?: string
}[]): Promise<number> {
  const supabase = createClient()
  const rows = prospects.map(p => ({
    tenant_id: tenantId,
    name: p.name,
    phone: p.phone,
    source: p.source,
    message: p.message || null,
  }))
  const { data, error } = await supabase.from("prospects").insert(rows).select()
  if (error) { console.error("Error creating prospects bulk:", error.message); return 0 }
  return data?.length || 0
}

export async function updateProspectStatus(id: string, status: Prospect["status"]): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("prospects").update({
    status, updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) { console.error("Error updating prospect:", error.message); return false }
  return true
}

export async function updateProspectNotes(id: string, notes: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("prospects").update({
    notes, updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) { console.error("Error updating notes:", error.message); return false }
  return true
}

export async function updateProspectCommercialDetails(id: string, data: {
  eventType?: "fete" | "mariage" | null
  eventDate?: string | null
  quoteStatus?: "non_demande" | "a_preparer" | "envoye" | "accepte" | "refuse"
  quoteAmount?: number | null
  quoteNotes?: string | null
  quoteBudget?: number | null
  quoteItems?: Array<{
    id: string
    category: "pf" | "boisson" | "autre"
    label: string
    unit: "pieces" | "kg" | "litres" | "bouteilles"
    quantity: number
    unitPrice: number
    lineTotal: number
  }> | null
}): Promise<boolean> {
  const supabase = createClient()
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (data.eventType !== undefined) updates.event_type = data.eventType
  if (data.eventDate !== undefined) updates.event_date = data.eventDate
  if (data.quoteStatus !== undefined) updates.quote_status = data.quoteStatus
  if (data.quoteAmount !== undefined) updates.quote_amount = data.quoteAmount
  if (data.quoteNotes !== undefined) updates.quote_notes = data.quoteNotes
  if (data.quoteBudget !== undefined) updates.quote_budget = data.quoteBudget
  if (data.quoteItems !== undefined) updates.quote_items = data.quoteItems ?? []

  const { error } = await supabase.from("prospects").update(updates).eq("id", id)
  if (error) { console.error("Error updating prospect commercial details:", error.message); return false }
  return true
}

export async function setProspectReminder(id: string, reminderAt: string | null): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("prospects").update({
    reminder_at: reminderAt, reminder_dismissed: false, updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) { console.error("Error setting reminder:", error.message); return false }
  return true
}

export async function dismissReminder(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("prospects").update({
    reminder_dismissed: true, updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) { console.error("Error dismissing reminder:", error.message); return false }
  return true
}

export async function convertProspectToOrder(id: string, orderId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("prospects").update({
    status: "converti", converted_order_id: orderId, updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) { console.error("Error converting prospect:", error.message); return false }
  return true
}

export async function deleteProspect(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("prospects").delete().eq("id", id)
  if (error) { console.error("Error deleting prospect:", error.message); return false }
  return true
}

// Extract phone numbers from a raw text (DM copy-paste)
export function extractPhonesFromText(text: string): { name: string; phone: string }[] {
  const lines = text.split("\n").filter(l => l.trim())
  const phoneRegex = /(\+?(?:216|33|1)?\s*\d[\d\s\-\.]{6,14}\d)/g
  const results: { name: string; phone: string }[] = []

  for (const line of lines) {
    const phones = line.match(phoneRegex)
    if (phones) {
      for (const phone of phones) {
        const cleaned = phone.replace(/[\s\-\.]/g, "")
        const nameCandidate = line.replace(phoneRegex, "").replace(/[:\-,;]/g, " ").trim()
        results.push({
          name: nameCandidate || "Prospect",
          phone: cleaned,
        })
      }
    }
  }
  return results
}
