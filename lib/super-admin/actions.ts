"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

// ─── Guard: verify the caller is a super admin ────────────────
async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.is_super_admin !== true) {
    redirect("/dashboard")
  }

  return { supabase, user }
}

// ─── Types ────────────────────────────────────────────────────
export interface TenantOverview {
  id: string
  name: string
  slug: string
  primary_color: string
  subscription_plan: string
  is_active: boolean
  created_at: string
  user_count: number
}

export interface TenantDetail {
  id: string
  name: string
  slug: string
  primary_color: string
  subscription_plan: string
  is_active: boolean
  created_at: string
  users: TenantUserInfo[]
}

export interface TenantUserInfo {
  id: string
  user_id: string
  role: string
  display_name: string
  created_at: string
  email?: string
}

export interface SuperAdminStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  planBreakdown: { plan: string; count: number }[]
}

// ─── Actions ──────────────────────────────────────────────────

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const { supabase } = await requireSuperAdmin()

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, is_active, subscription_plan")

  const { count: totalUsers } = await supabase
    .from("tenant_users")
    .select("*", { count: "exact", head: true })

  const allTenants = tenants || []
  const activeTenants = allTenants.filter((t) => t.is_active !== false).length

  // Group by subscription plan
  const planMap = new Map<string, number>()
  allTenants.forEach((t) => {
    const plan = t.subscription_plan || "free"
    planMap.set(plan, (planMap.get(plan) || 0) + 1)
  })
  const planBreakdown = Array.from(planMap.entries()).map(([plan, count]) => ({
    plan,
    count,
  }))

  return {
    totalTenants: allTenants.length,
    activeTenants,
    totalUsers: totalUsers || 0,
    planBreakdown,
  }
}

export async function getAllTenants(): Promise<TenantOverview[]> {
  const { supabase } = await requireSuperAdmin()

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, primary_color, subscription_plan, is_active, created_at")
    .order("created_at", { ascending: false })

  if (!tenants) return []

  // Get user counts per tenant
  const { data: userCounts } = await supabase
    .from("tenant_users")
    .select("tenant_id")

  const countMap = new Map<string, number>()
  userCounts?.forEach((u) => {
    countMap.set(u.tenant_id, (countMap.get(u.tenant_id) || 0) + 1)
  })

  return tenants.map((t) => ({
    ...t,
    slug: t.slug || "",
    primary_color: t.primary_color || "#4A7C59",
    subscription_plan: t.subscription_plan || "free",
    is_active: t.is_active !== false,
    user_count: countMap.get(t.id) || 0,
  }))
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
  const { supabase } = await requireSuperAdmin()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single()

  if (!tenant) return null

  const { data: tenantUsers } = await supabase
    .from("tenant_users")
    .select("id, user_id, role, display_name, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug || "",
    primary_color: tenant.primary_color || "#4A7C59",
    subscription_plan: tenant.subscription_plan || "free",
    is_active: tenant.is_active !== false,
    created_at: tenant.created_at,
    users: (tenantUsers || []).map((u) => ({
      id: u.id,
      user_id: u.user_id,
      role: u.role,
      display_name: u.display_name || "",
      created_at: u.created_at,
    })),
  }
}

export async function updateTenantStatus(tenantId: string, isActive: boolean) {
  const { supabase } = await requireSuperAdmin()

  const { error } = await supabase
    .from("tenants")
    .update({ is_active: isActive })
    .eq("id", tenantId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function updateTenantPlan(tenantId: string, plan: string) {
  const { supabase } = await requireSuperAdmin()

  const { error } = await supabase
    .from("tenants")
    .update({ subscription_plan: plan })
    .eq("id", tenantId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export interface GlobalUser {
  user_id: string
  display_name: string
  role: string
  tenant_id: string
  tenant_name: string
  created_at: string
}

export async function getAllUsers(): Promise<GlobalUser[]> {
  const { supabase } = await requireSuperAdmin()

  const { data: tenantUsers } = await supabase
    .from("tenant_users")
    .select("user_id, display_name, role, tenant_id, created_at")
    .order("created_at", { ascending: false })

  if (!tenantUsers) return []

  // Get tenant names
  const tenantIds = [...new Set(tenantUsers.map((u) => u.tenant_id))]
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds)

  const tenantNameMap = new Map<string, string>()
  tenants?.forEach((t) => tenantNameMap.set(t.id, t.name))

  return tenantUsers.map((u) => ({
    user_id: u.user_id,
    display_name: u.display_name || "Sans nom",
    role: u.role,
    tenant_id: u.tenant_id,
    tenant_name: tenantNameMap.get(u.tenant_id) || "Inconnu",
    created_at: u.created_at,
  }))
}

export async function deleteTenant(tenantId: string) {
  const { supabase } = await requireSuperAdmin()

  // Delete tenant_users first (cascade should handle, but be explicit)
  await supabase.from("tenant_users").delete().eq("tenant_id", tenantId)

  const { error } = await supabase.from("tenants").delete().eq("id", tenantId)

  if (error) throw new Error(error.message)
  return { success: true }
}
