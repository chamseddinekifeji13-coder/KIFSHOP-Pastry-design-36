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
  subscription_status: string
  is_active: boolean
  created_at: string
  trial_ends_at: string | null
  user_count: number
}

export interface TenantDetail {
  id: string
  name: string
  slug: string
  primary_color: string
  subscription_plan: string
  subscription_status: string
  is_active: boolean
  created_at: string
  trial_ends_at: string | null
  users: TenantUserInfo[]
  subscription: SubscriptionInfo | null
}

export interface SubscriptionInfo {
  id: string
  plan_id: string | null
  plan_name: string | null
  plan_display_name: string | null
  status: string
  trial_starts_at: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
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
  trialTenants: number
  suspendedTenants: number
  monthlyRevenue: number
  planBreakdown: { plan: string; count: number }[]
  statusBreakdown: { status: string; count: number }[]
}

export interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  price_monthly: number
  max_sales_channels: number
  max_warehouses: number
  max_users: number
  features: Record<string, string>
  is_active: boolean
}

export interface PaymentRecord {
  id: string
  tenant_id: string
  tenant_name?: string
  subscription_id: string | null
  amount: number
  payment_method: string
  reference: string | null
  notes: string | null
  confirmed_at: string
  period_start: string
  period_end: string
  created_at: string
}

export interface PlatformSettings {
  default_trial_days: string
}

// ─── Actions ──────────────────────────────────────────────────

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const { supabase } = await requireSuperAdmin()

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, is_active, subscription_plan, subscription_status")

  const { count: totalUsers } = await supabase
    .from("tenant_users")
    .select("*", { count: "exact", head: true })

  // Get active subscriptions revenue
  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("status", "active")

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, price_monthly")

  const planPriceMap = new Map<string, number>()
  plans?.forEach((p) => planPriceMap.set(p.id, p.price_monthly))

  let monthlyRevenue = 0
  activeSubscriptions?.forEach((s) => {
    if (s.plan_id) monthlyRevenue += planPriceMap.get(s.plan_id) || 0
  })

  const allTenants = tenants || []
  const activeTenants = allTenants.filter((t) => t.is_active !== false).length
  const trialTenants = allTenants.filter((t) => t.subscription_status === "trial").length
  const suspendedTenants = allTenants.filter((t) => t.is_active === false || t.subscription_status === "suspended").length

  // Group by subscription plan
  const planMap = new Map<string, number>()
  allTenants.forEach((t) => {
    const plan = t.subscription_plan || "trial"
    planMap.set(plan, (planMap.get(plan) || 0) + 1)
  })
  const planBreakdown = Array.from(planMap.entries()).map(([plan, count]) => ({
    plan,
    count,
  }))

  // Group by status
  const statusMap = new Map<string, number>()
  allTenants.forEach((t) => {
    const status = t.subscription_status || "trial"
    statusMap.set(status, (statusMap.get(status) || 0) + 1)
  })
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }))

  return {
    totalTenants: allTenants.length,
    activeTenants,
    totalUsers: totalUsers || 0,
    trialTenants,
    suspendedTenants,
    monthlyRevenue,
    planBreakdown,
    statusBreakdown,
  }
}

export async function getAllTenants(): Promise<TenantOverview[]> {
  const { supabase } = await requireSuperAdmin()

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, primary_color, subscription_plan, subscription_status, is_active, created_at, trial_ends_at")
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
    subscription_plan: t.subscription_plan || "trial",
    subscription_status: t.subscription_status || "trial",
    is_active: t.is_active !== false,
    trial_ends_at: t.trial_ends_at || null,
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

  // Get subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, trial_starts_at, trial_ends_at, current_period_start, current_period_end")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  let subscriptionInfo: SubscriptionInfo | null = null
  if (subscription) {
    let planName: string | null = null
    let planDisplayName: string | null = null
    if (subscription.plan_id) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("name, display_name")
        .eq("id", subscription.plan_id)
        .single()
      planName = plan?.name || null
      planDisplayName = plan?.display_name || null
    }
    subscriptionInfo = {
      id: subscription.id,
      plan_id: subscription.plan_id,
      plan_name: planName,
      plan_display_name: planDisplayName,
      status: subscription.status,
      trial_starts_at: subscription.trial_starts_at,
      trial_ends_at: subscription.trial_ends_at,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
    }
  }

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug || "",
    primary_color: tenant.primary_color || "#4A7C59",
    subscription_plan: tenant.subscription_plan || "trial",
    subscription_status: tenant.subscription_status || "trial",
    is_active: tenant.is_active !== false,
    created_at: tenant.created_at,
    trial_ends_at: tenant.trial_ends_at || null,
    users: (tenantUsers || []).map((u) => ({
      id: u.id,
      user_id: u.user_id,
      role: u.role,
      display_name: u.display_name || "",
      created_at: u.created_at,
    })),
    subscription: subscriptionInfo,
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

// ─── Subscription Management ──────────────────────────────────

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { supabase } = await requireSuperAdmin()
  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_monthly", { ascending: true })
  return (data || []).map((p) => ({
    ...p,
    features: (p.features as Record<string, string>) || {},
  }))
}

export async function updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>) {
  const { supabase } = await requireSuperAdmin()
  const { error } = await supabase
    .from("subscription_plans")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", planId)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function activateTenantSubscription(
  tenantId: string,
  planId: string,
  periodMonths: number = 1
) {
  const { supabase, user } = await requireSuperAdmin()

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + periodMonths)

  // Get plan info
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("name, display_name, price_monthly")
    .eq("id", planId)
    .single()

  if (!plan) throw new Error("Plan introuvable")

  // Update subscription record
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existingSub) {
    await supabase
      .from("subscriptions")
      .update({
        plan_id: planId,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", existingSub.id)
  } else {
    await supabase.from("subscriptions").insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
  }

  // Update tenant
  await supabase
    .from("tenants")
    .update({
      subscription_plan: plan.name,
      subscription_status: "active",
      is_active: true,
      updated_at: now.toISOString(),
    })
    .eq("id", tenantId)

  return { success: true }
}

export async function suspendTenantSubscription(tenantId: string) {
  const { supabase } = await requireSuperAdmin()

  // Update subscription
  await supabase
    .from("subscriptions")
    .update({ status: "suspended", updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .neq("status", "suspended")

  // Update tenant
  await supabase
    .from("tenants")
    .update({
      subscription_status: "suspended",
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)

  return { success: true }
}

export async function recordPayment(data: {
  tenantId: string
  subscriptionId: string | null
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  periodStart: string
  periodEnd: string
}) {
  const { supabase, user } = await requireSuperAdmin()

  const { error } = await supabase.from("payments").insert({
    tenant_id: data.tenantId,
    subscription_id: data.subscriptionId,
    amount: data.amount,
    payment_method: data.paymentMethod,
    reference: data.reference || null,
    notes: data.notes || null,
    confirmed_by: user.id,
    period_start: data.periodStart,
    period_end: data.periodEnd,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getTenantPayments(tenantId: string): Promise<PaymentRecord[]> {
  const { supabase } = await requireSuperAdmin()
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  return data || []
}

export async function getAllPayments(): Promise<PaymentRecord[]> {
  const { supabase } = await requireSuperAdmin()
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })

  if (!payments || payments.length === 0) return []

  const tenantIds = [...new Set(payments.map((p) => p.tenant_id))]
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds)

  const nameMap = new Map<string, string>()
  tenants?.forEach((t) => nameMap.set(t.id, t.name))

  return payments.map((p) => ({
    ...p,
    tenant_name: nameMap.get(p.tenant_id) || "Inconnu",
  }))
}

// ─── Platform Settings ────────────────────────────────────────

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { supabase } = await requireSuperAdmin()
  const { data } = await supabase.from("platform_settings").select("key, value")

  const settings: Record<string, string> = {}
  data?.forEach((s) => {
    settings[s.key] = s.value
  })

  return {
    default_trial_days: settings.default_trial_days || "14",
  }
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>) {
  const { supabase, user } = await requireSuperAdmin()

  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      await supabase
        .from("platform_settings")
        .upsert({
          key,
          value: String(value),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
    }
  }

  return { success: true }
}

export async function setTenantTrialDays(tenantId: string, trialDays: number) {
  const { supabase } = await requireSuperAdmin()

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + trialDays)

  // Update tenant
  await supabase
    .from("tenants")
    .update({
      trial_ends_at: trialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)

  // Update subscription
  await supabase
    .from("subscriptions")
    .update({
      trial_ends_at: trialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("status", "trial")

  return { success: true }
}
