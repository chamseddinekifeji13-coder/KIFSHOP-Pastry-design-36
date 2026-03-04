"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.is_super_admin !== true) redirect("/dashboard")
  const adminClient = createAdminClient()
  return { supabase: adminClient, user }
}

// ─── Types ────────────────────────────────────────────────────
export type ProspectStatus = "nouveau" | "contacte" | "interesse" | "demo_planifiee" | "negociation" | "converti" | "perdu"
export type ProspectSource = "facebook" | "instagram" | "google" | "direct" | "referral" | "salon" | "autre"

export interface PlatformProspect {
  id: string
  businessName: string
  ownerName: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  source: ProspectSource
  status: ProspectStatus
  notes: string | null
  nextAction: string | null
  nextActionDate: string | null
  convertedTenantId: string | null
  createdAt: string
  updatedAt: string
}

export interface ProspectStats {
  total: number
  byStatus: Record<ProspectStatus, number>
  conversionRate: number
  upcomingActions: number
  thisMonth: number
}

// ─── Status labels ────────────────────────────────────────────
export const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacte",
  interesse: "Interesse",
  demo_planifiee: "Demo planifiee",
  negociation: "Negociation",
  converti: "Converti",
  perdu: "Perdu",
}

export const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: "bg-blue-100 text-blue-800",
  contacte: "bg-amber-100 text-amber-800",
  interesse: "bg-emerald-100 text-emerald-800",
  demo_planifiee: "bg-purple-100 text-purple-800",
  negociation: "bg-orange-100 text-orange-800",
  converti: "bg-green-100 text-green-800",
  perdu: "bg-red-100 text-red-800",
}

export const SOURCE_LABELS: Record<ProspectSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  direct: "Contact direct",
  referral: "Recommandation",
  salon: "Salon/Evenement",
  autre: "Autre",
}

// ─── Fetch all prospects ──────────────────────────────────────
export async function fetchPlatformProspects(): Promise<PlatformProspect[]> {
  const { supabase } = await requireSuperAdmin()
  const { data, error } = await supabase
    .from("platform_prospects")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) { console.error("Error fetching platform prospects:", error.message); return [] }

  return (data || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    businessName: p.business_name as string,
    ownerName: (p.owner_name as string) || null,
    phone: (p.phone as string) || null,
    email: (p.email as string) || null,
    city: (p.city as string) || null,
    address: (p.address as string) || null,
    source: p.source as ProspectSource,
    status: p.status as ProspectStatus,
    notes: (p.notes as string) || null,
    nextAction: (p.next_action as string) || null,
    nextActionDate: (p.next_action_date as string) || null,
    convertedTenantId: (p.converted_tenant_id as string) || null,
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  }))
}

// ─── Stats ────────────────────────────────────────────────────
export async function fetchProspectStats(): Promise<ProspectStats> {
  const { supabase } = await requireSuperAdmin()
  const { data, error } = await supabase.from("platform_prospects").select("status, created_at, next_action_date")

  if (error || !data) return { total: 0, byStatus: { nouveau: 0, contacte: 0, interesse: 0, demo_planifiee: 0, negociation: 0, converti: 0, perdu: 0 }, conversionRate: 0, upcomingActions: 0, thisMonth: 0 }

  const byStatus = { nouveau: 0, contacte: 0, interesse: 0, demo_planifiee: 0, negociation: 0, converti: 0, perdu: 0 } as Record<ProspectStatus, number>
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  let upcomingActions = 0
  let thisMonth = 0

  for (const row of data) {
    const s = row.status as ProspectStatus
    if (byStatus[s] !== undefined) byStatus[s]++
    if (row.next_action_date && new Date(row.next_action_date as string) >= now) upcomingActions++
    if (row.created_at && (row.created_at as string) >= startOfMonth) thisMonth++
  }

  const total = data.length
  const closed = byStatus.converti + byStatus.perdu
  const conversionRate = closed > 0 ? Math.round((byStatus.converti / closed) * 100) : 0

  return { total, byStatus, conversionRate, upcomingActions, thisMonth }
}

// ─── Create ───────────────────────────────────────────────────
export async function createPlatformProspect(data: {
  businessName: string; ownerName?: string; phone?: string; email?: string;
  city?: string; address?: string; source: ProspectSource; notes?: string;
  nextAction?: string; nextActionDate?: string
}): Promise<PlatformProspect | null> {
  const { supabase } = await requireSuperAdmin()
  const { data: row, error } = await supabase.from("platform_prospects").insert({
    business_name: data.businessName,
    owner_name: data.ownerName || null,
    phone: data.phone || null,
    email: data.email || null,
    city: data.city || null,
    address: data.address || null,
    source: data.source,
    notes: data.notes || null,
    next_action: data.nextAction || null,
    next_action_date: data.nextActionDate || null,
  }).select("*").single()

  if (error || !row) { console.error("Error creating prospect:", error?.message); return null }

  return {
    id: row.id, businessName: row.business_name, ownerName: row.owner_name,
    phone: row.phone, email: row.email, city: row.city, address: row.address,
    source: row.source, status: row.status, notes: row.notes,
    nextAction: row.next_action, nextActionDate: row.next_action_date,
    convertedTenantId: row.converted_tenant_id, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

// ─── Update ───────────────────────────────────────────────────
export async function updatePlatformProspect(id: string, data: Partial<{
  businessName: string; ownerName: string; phone: string; email: string;
  city: string; address: string; source: ProspectSource; status: ProspectStatus;
  notes: string; nextAction: string; nextActionDate: string; convertedTenantId: string
}>): Promise<boolean> {
  const { supabase } = await requireSuperAdmin()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.businessName !== undefined) updates.business_name = data.businessName
  if (data.ownerName !== undefined) updates.owner_name = data.ownerName
  if (data.phone !== undefined) updates.phone = data.phone
  if (data.email !== undefined) updates.email = data.email
  if (data.city !== undefined) updates.city = data.city
  if (data.address !== undefined) updates.address = data.address
  if (data.source !== undefined) updates.source = data.source
  if (data.status !== undefined) updates.status = data.status
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.nextAction !== undefined) updates.next_action = data.nextAction
  if (data.nextActionDate !== undefined) updates.next_action_date = data.nextActionDate
  if (data.convertedTenantId !== undefined) updates.converted_tenant_id = data.convertedTenantId

  const { error } = await supabase.from("platform_prospects").update(updates).eq("id", id)
  if (error) { console.error("Error updating prospect:", error.message); return false }
  return true
}

// ─── Delete ───────────────────────────────────────────────────
export async function deletePlatformProspect(id: string): Promise<boolean> {
  const { supabase } = await requireSuperAdmin()
  const { error } = await supabase.from("platform_prospects").delete().eq("id", id)
  if (error) { console.error("Error deleting prospect:", error.message); return false }
  return true
}
