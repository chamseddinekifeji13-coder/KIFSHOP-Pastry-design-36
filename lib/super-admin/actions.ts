"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function ensureUuid(value: string, fieldName: string) {
  if (!UUID_RE.test(value)) {
    throw new Error(`${fieldName} invalide`)
  }
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
  last_login: string | null
  app_version: string
  open_tickets: number
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
  app_version: string
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
  inactiveLast7Days: number
  outdatedVersions: number
  totalOpenTickets: number
  currentAppVersion: string
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

const CURRENT_APP_VERSION = "1.2.0"

export async function getCurrentAppVersion() {
  return CURRENT_APP_VERSION
}

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const { supabase } = await requireSuperAdmin()

  const [
    { data: tenants },
    { count: totalUsers },
    { data: opData },
    { count: totalOpenTickets },
  ] = await Promise.all([
    supabase.from("tenants").select("id, is_active, subscription_plan, subscription_status, app_version"),
    supabase.from("tenant_users").select("*", { count: "exact", head: true }),
    supabase.rpc("get_tenant_operational_data"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ])

  const opsMap: Record<string, { last_login: string | null; open_tickets: number; app_version: string }> = opData || {}
  const allTenants = tenants || []
  const activeTenants = allTenants.filter((t) => t.is_active !== false).length
  const trialTenants = allTenants.filter((t) => t.subscription_status === "trial").length
  const suspendedTenants = allTenants.filter((t) => t.is_active === false || t.subscription_status === "suspended").length

  // Count tenants with no login in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let inactiveLast7Days = 0
  let outdatedVersions = 0
  for (const t of allTenants) {
    const ops = opsMap[t.id]
    if (!ops?.last_login || ops.last_login < sevenDaysAgo) inactiveLast7Days++
    const version = ops?.app_version || t.app_version || "1.0.0"
    if (version !== CURRENT_APP_VERSION) outdatedVersions++
  }

  // Group by subscription plan
  const planMap = new Map<string, number>()
  allTenants.forEach((t) => {
    const plan = t.subscription_plan || "trial"
    planMap.set(plan, (planMap.get(plan) || 0) + 1)
  })
  const planBreakdown = Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count }))

  // Group by status
  const statusMap = new Map<string, number>()
  allTenants.forEach((t) => {
    const status = t.subscription_status || "trial"
    statusMap.set(status, (statusMap.get(status) || 0) + 1)
  })
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

  return {
    totalTenants: allTenants.length,
    activeTenants,
    totalUsers: totalUsers || 0,
    trialTenants,
    suspendedTenants,
    inactiveLast7Days,
    outdatedVersions,
    totalOpenTickets: totalOpenTickets || 0,
    currentAppVersion: CURRENT_APP_VERSION,
    planBreakdown,
    statusBreakdown,
  }
}

export async function getAllTenants(): Promise<TenantOverview[]> {
  const { supabase } = await requireSuperAdmin()

  const [
    { data: tenants },
    { data: userCounts },
    { data: opData },
  ] = await Promise.all([
    supabase.from("tenants")
      .select("id, name, slug, primary_color, subscription_plan, subscription_status, is_active, created_at, trial_ends_at, app_version")
      .order("created_at", { ascending: false }),
    supabase.from("tenant_users").select("tenant_id"),
    supabase.rpc("get_tenant_operational_data"),
  ])

  if (!tenants) return []

  const countMap = new Map<string, number>()
  userCounts?.forEach((u) => {
    countMap.set(u.tenant_id, (countMap.get(u.tenant_id) || 0) + 1)
  })

  const opsMap: Record<string, { last_login: string | null; open_tickets: number; app_version: string }> = opData || {}

  return tenants.map((t) => {
    const ops = opsMap[t.id]
    return {
      ...t,
      slug: t.slug || "",
      primary_color: t.primary_color || "#4A7C59",
      subscription_plan: t.subscription_plan || "trial",
      subscription_status: t.subscription_status || "trial",
      is_active: t.is_active !== false,
      trial_ends_at: t.trial_ends_at || null,
      user_count: countMap.get(t.id) || 0,
      last_login: ops?.last_login || null,
      app_version: ops?.app_version || t.app_version || "1.0.0",
      open_tickets: ops?.open_tickets || 0,
    }
  })
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
    app_version: tenant.app_version || "1.0.0",
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

// ─── Support Tickets (Super Admin) ───────────────────────────

export interface AdminTicketOverview {
  id: string
  tenant_id: string
  tenant_name: string
  created_by_name: string
  subject: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface AdminTicketMessage {
  id: string
  ticket_id: string
  sender_type: string
  sender_name: string
  message: string
  created_at: string
}

export async function getAllTickets(): Promise<AdminTicketOverview[]> {
  const { supabase } = await requireSuperAdmin()

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error || !tickets) return []

  // Get tenant names
  const tenantIds = [...new Set(tickets.map((t) => t.tenant_id))]
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds.length > 0 ? tenantIds : ["__none__"])

  const tenantMap = new Map<string, string>()
  tenants?.forEach((t) => tenantMap.set(t.id, t.name))

  // Get message counts
  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("ticket_id")

  const countMap = new Map<string, number>()
  messages?.forEach((m) => {
    countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1)
  })

  return tickets.map((t) => ({
    id: t.id,
    tenant_id: t.tenant_id,
    tenant_name: tenantMap.get(t.tenant_id) || "Inconnu",
    created_by_name: t.created_by_name,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
    message_count: countMap.get(t.id) || 0,
  }))
}

export async function getTicketMessages(ticketId: string): Promise<AdminTicketMessage[]> {
  ensureUuid(ticketId, "ticketId")
  const { supabase } = await requireSuperAdmin()

  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (error || !data) return []

  return data.map((m) => ({
    id: m.id,
    ticket_id: m.ticket_id,
    sender_type: m.sender_type,
    sender_name: m.sender_name,
    message: m.message,
    created_at: m.created_at,
  }))
}

export async function replyToTicket(ticketId: string, message: string): Promise<{ success: boolean }> {
  ensureUuid(ticketId, "ticketId")
  const { supabase } = await requireSuperAdmin()

  const { error: msgError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_type: "admin",
    sender_name: "KIFSHOP Support",
    message,
  })

  if (msgError) throw new Error(msgError.message)

  // Update ticket status and timestamp
  await supabase
    .from("support_tickets")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", ticketId)

  return { success: true }
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<{ success: boolean }> {
  ensureUuid(ticketId, "ticketId")
  const { supabase } = await requireSuperAdmin()

  const { error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId)

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

export async function reactivateTenantSubscription(tenantId: string) {
  const { supabase } = await requireSuperAdmin()

  // Get the latest subscription to determine what status to restore
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, current_period_end")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Determine the restored status: if there was a plan, restore to "active", otherwise "trial"
  const hasPlan = sub?.plan_id != null
  const restoredStatus = hasPlan ? "active" : "trial"

  // Update subscription record
  if (sub) {
    await supabase
      .from("subscriptions")
      .update({ status: restoredStatus, updated_at: new Date().toISOString() })
      .eq("id", sub.id)
  }

  // Update tenant
  await supabase
    .from("tenants")
    .update({
      subscription_status: restoredStatus,
  is_active: true,
  updated_at: new Date().toISOString(),
  })
  .eq("id", tenantId)
  
  return { success: true }
}

export async function updateTenantAppVersion(tenantId: string) {
  const { supabase } = await requireSuperAdmin()

  await supabase
    .from("tenants")
    .update({
      app_version: CURRENT_APP_VERSION,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)

  return { success: true }
}

export async function updateAllTenantsAppVersion() {
  const { supabase } = await requireSuperAdmin()

  await supabase
    .from("tenants")
    .update({
      app_version: CURRENT_APP_VERSION,
      updated_at: new Date().toISOString(),
    })
    .neq("app_version", CURRENT_APP_VERSION)

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

// ─── User Email Confirmation (Admin) ──────────────────────────

export async function confirmUserEmail(userId: string) {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export interface UnconfirmedUser {
  id: string
  email: string
  display_name: string
  tenant_name: string
  created_at: string
}

export async function getUnconfirmedUsers(): Promise<UnconfirmedUser[]> {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  // List all users from auth
  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (error || !data?.users) return []

  // Filter unconfirmed users (exclude super admins)
  const unconfirmed = data.users.filter(
    (u) => !u.email_confirmed_at && u.user_metadata?.is_super_admin !== true
  )

  if (unconfirmed.length === 0) return []

  // Get tenant info for unconfirmed users
  const userIds = unconfirmed.map((u) => u.id)
  const supabase = (await requireSuperAdmin()).supabase

  const { data: tenantUsers } = await supabase
    .from("tenant_users")
    .select("user_id, display_name, tenant_id")
    .in("user_id", userIds)

  const tenantIds = [...new Set((tenantUsers || []).map((tu) => tu.tenant_id))]
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds.length > 0 ? tenantIds : ["__none__"])

  const tenantNameMap = new Map<string, string>()
  tenants?.forEach((t) => tenantNameMap.set(t.id, t.name))

  const tuMap = new Map<string, { display_name: string; tenant_id: string }>()
  tenantUsers?.forEach((tu) => tuMap.set(tu.user_id, tu))

  return unconfirmed.map((u) => {
    const tu = tuMap.get(u.id)
    return {
      id: u.id,
      email: u.email || "",
      display_name: tu?.display_name || u.user_metadata?.display_name || "Sans nom",
      tenant_name: tu ? (tenantNameMap.get(tu.tenant_id) || "Inconnu") : "Aucun tenant",
      created_at: u.created_at,
    }
  })
}

export async function getTenantUnconfirmedUserIds(tenantId: string): Promise<string[]> {
  const { supabase } = await requireSuperAdmin()
  const adminClient = createAdminClient()

  // Get tenant user_ids
  const { data: tenantUsers } = await supabase
    .from("tenant_users")
    .select("user_id")
    .eq("tenant_id", tenantId)

  if (!tenantUsers || tenantUsers.length === 0) return []

  // Check confirmation status via admin API
  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (error || !data?.users) return []

  const authUserMap = new Map(data.users.map((u) => [u.id, u]))
  const unconfirmedIds: string[] = []

  for (const tu of tenantUsers) {
    const authUser = authUserMap.get(tu.user_id)
    if (authUser && !authUser.email_confirmed_at) {
      unconfirmedIds.push(tu.user_id)
    }
  }

  return unconfirmedIds
}

// ─── Tenant Data Access (for corrections) ────────────────────

export interface TenantProduct {
  id: string
  name: string
  type: "raw_material" | "finished_product" | "packaging"
  unit: string
  currentStock: number
  price: number // price_per_unit for RM, selling_price for FP, price for PKG
  costPrice?: number // cost_price for FP only
}

export interface TenantOrder {
  id: string
  customerName: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  itemCount: number
}

export async function getTenantProducts(tenantId: string): Promise<TenantProduct[]> {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const [{ data: rawMaterials }, { data: finishedProducts }, { data: packaging }] = await Promise.all([
    adminClient.from("raw_materials").select("id, name, unit, current_stock, price_per_unit").eq("tenant_id", tenantId).order("name"),
    adminClient.from("finished_products").select("id, name, unit, current_stock, selling_price, cost_price").eq("tenant_id", tenantId).order("name"),
    adminClient.from("packaging").select("id, name, unit, current_stock, price").eq("tenant_id", tenantId).order("name"),
  ])

  const products: TenantProduct[] = []

  rawMaterials?.forEach((r) => products.push({
    id: r.id, name: r.name, type: "raw_material", unit: r.unit,
    currentStock: Number(r.current_stock), price: Number(r.price_per_unit),
  }))

  finishedProducts?.forEach((f) => products.push({
    id: f.id, name: f.name, type: "finished_product", unit: f.unit,
    currentStock: Number(f.current_stock), price: Number(f.selling_price),
    costPrice: Number(f.cost_price),
  }))

  packaging?.forEach((p) => products.push({
    id: p.id, name: p.name, type: "packaging", unit: p.unit,
    currentStock: Number(p.current_stock), price: Number(p.price),
  }))

  return products
}

export async function getTenantOrders(tenantId: string): Promise<TenantOrder[]> {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const { data: orders } = await adminClient
    .from("orders")
    .select("id, customer_name, total, status, payment_status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (!orders) return []

  // Get item counts
  const orderIds = orders.map((o) => o.id)
  const { data: items } = await adminClient
    .from("order_items")
    .select("order_id")
    .in("order_id", orderIds.length > 0 ? orderIds : ["__none__"])

  const countMap = new Map<string, number>()
  items?.forEach((i) => countMap.set(i.order_id, (countMap.get(i.order_id) || 0) + 1))

  return orders.map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    total: Number(o.total),
    status: o.status,
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
    itemCount: countMap.get(o.id) || 0,
  }))
}

export async function adminCorrectStock(
  ticketId: string,
  tenantId: string,
  itemType: "raw_material" | "finished_product" | "packaging",
  itemId: string,
  newQuantity: number,
  reason: string
): Promise<{ success: boolean }> {
  ensureUuid(ticketId, "ticketId")
  ensureUuid(tenantId, "tenantId")
  ensureUuid(itemId, "itemId")
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const tableMap = { raw_material: "raw_materials", finished_product: "finished_products", packaging: "packaging" }
  const table = tableMap[itemType]

  // Get current data
  const { data: item } = await adminClient.from(table).select("name, current_stock, unit").eq("id", itemId).single()
  if (!item) throw new Error("Produit introuvable")

  const oldQty = Number(item.current_stock)

  // Update stock
  const { error } = await adminClient
    .from(table)
    .update({ current_stock: newQuantity, updated_at: new Date().toISOString() })
    .eq("id", itemId)

  if (error) throw new Error(error.message)

  // Record stock movement
  const fkColumn = itemType === "raw_material" ? "raw_material_id" : itemType === "finished_product" ? "finished_product_id" : "packaging_id"
  await adminClient.from("stock_movements").insert({
    tenant_id: tenantId,
    item_type: itemType === "raw_material" ? "mp" : itemType === "finished_product" ? "pf" : "emballage",
    [fkColumn]: itemId,
    movement_type: "correction_admin",
    quantity: newQuantity - oldQty,
    unit: item.unit,
    reason: `[Admin] ${reason}`,
    reference: `ticket:${ticketId}`,
  })

  // Trace in ticket conversation
  const typeLabel = itemType === "raw_material" ? "MP" : itemType === "finished_product" ? "PF" : "Emballage"
  await adminClient.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_type: "system",
    sender_name: "Correction automatique",
    message: `CORRECTION STOCK | ${typeLabel}: ${item.name} | ${oldQty} ${item.unit} → ${newQuantity} ${item.unit} | Raison: ${reason}`,
  })

  await adminClient.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId)

  return { success: true }
}

export async function adminCorrectPrice(
  ticketId: string,
  tenantId: string,
  itemType: "raw_material" | "finished_product" | "packaging",
  itemId: string,
  newPrice: number,
  priceField: "selling" | "cost" | "unit",
  reason: string
): Promise<{ success: boolean }> {
  ensureUuid(ticketId, "ticketId")
  ensureUuid(tenantId, "tenantId")
  ensureUuid(itemId, "itemId")
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const tableMap = { raw_material: "raw_materials", finished_product: "finished_products", packaging: "packaging" }
  const table = tableMap[itemType]

  // Determine column
  let column: string
  let priceLabel: string
  if (itemType === "raw_material") {
    column = "price_per_unit"
    priceLabel = "Prix unitaire"
  } else if (itemType === "finished_product") {
    column = priceField === "cost" ? "cost_price" : "selling_price"
    priceLabel = priceField === "cost" ? "Prix de revient" : "Prix de vente"
  } else {
    column = "price"
    priceLabel = "Prix"
  }

  // Get current data
  const { data: rawItem, error: itemError } = await adminClient
    .from(table)
    .select(`name, ${column}`)
    .eq("id", itemId)
    .single()
  if (itemError) throw new Error(itemError.message)
  if (!rawItem || typeof rawItem !== "object") throw new Error("Produit introuvable")
  const item = rawItem as Record<string, unknown>

  const oldPrice = Number(item[column])

  // Update price
  const { error } = await adminClient
    .from(table)
    .update({ [column]: newPrice, updated_at: new Date().toISOString() })
    .eq("id", itemId)

  if (error) throw new Error(error.message)

  // Trace in ticket conversation
  const typeLabel = itemType === "raw_material" ? "MP" : itemType === "finished_product" ? "PF" : "Emballage"
  await adminClient.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_type: "system",
    sender_name: "Correction automatique",
    message: `CORRECTION PRIX | ${typeLabel}: ${item.name} | ${priceLabel}: ${oldPrice} DT → ${newPrice} DT | Raison: ${reason}`,
  })

  await adminClient.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId)

  return { success: true }
}

export async function adminCorrectOrder(
  ticketId: string,
  orderId: string,
  updates: { total?: number; status?: string; paymentStatus?: string },
  reason: string
): Promise<{ success: boolean }> {
  ensureUuid(ticketId, "ticketId")
  ensureUuid(orderId, "orderId")
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  // Get current order
  const { data: order } = await adminClient
    .from("orders")
    .select("customer_name, total, status, payment_status")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("Commande introuvable")

  // Build update object
  const updateObj: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const changes: string[] = []

  if (updates.total !== undefined && updates.total !== Number(order.total)) {
    updateObj.total = updates.total
    changes.push(`Total: ${Number(order.total)} DT → ${updates.total} DT`)
  }
  if (updates.status && updates.status !== order.status) {
    updateObj.status = updates.status
    changes.push(`Statut: ${order.status} → ${updates.status}`)
  }
  if (updates.paymentStatus && updates.paymentStatus !== order.payment_status) {
    updateObj.payment_status = updates.paymentStatus
    changes.push(`Paiement: ${order.payment_status} → ${updates.paymentStatus}`)
  }

  if (changes.length === 0) return { success: true }

  const { error } = await adminClient.from("orders").update(updateObj).eq("id", orderId)
  if (error) throw new Error(error.message)

  // Trace in ticket conversation
  await adminClient.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_type: "system",
    sender_name: "Correction automatique",
    message: `CORRECTION COMMANDE | Client: ${order.customer_name} | ${changes.join(" | ")} | Raison: ${reason}`,
  })

  await adminClient.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId)

  return { success: true }
}

// ─── Articles Management (Super Admin) ──────────────────────

export interface AdminArticle {
  id: string
  name: string
  type: "raw_material" | "finished_product" | "packaging"
  unit: string
  currentStock: number
  price: number
  tenant_id: string
  tenant_name: string
}

export async function getAllArticles(tenantId?: string): Promise<AdminArticle[]> {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  // Get tenants for name mapping
  const { data: tenants } = await adminClient.from("tenants").select("id, name")
  const tenantMap = new Map<string, string>()
  tenants?.forEach((t) => tenantMap.set(t.id, t.name))

  // Build queries based on optional tenant filter
  const rmQuery = adminClient.from("raw_materials").select("id, name, unit, current_stock, price_per_unit, tenant_id").order("name")
  const fpQuery = adminClient.from("finished_products").select("id, name, unit, current_stock, selling_price, tenant_id").order("name")
  const pkgQuery = adminClient.from("packaging").select("id, name, unit, current_stock, price, tenant_id").order("name")

  if (tenantId) {
    rmQuery.eq("tenant_id", tenantId)
    fpQuery.eq("tenant_id", tenantId)
    pkgQuery.eq("tenant_id", tenantId)
  }

  const [{ data: rawMaterials }, { data: finishedProducts }, { data: packaging }] = await Promise.all([
    rmQuery, fpQuery, pkgQuery,
  ])

  const articles: AdminArticle[] = []

  rawMaterials?.forEach((r) => articles.push({
    id: r.id, name: r.name, type: "raw_material", unit: r.unit,
    currentStock: Number(r.current_stock), price: Number(r.price_per_unit),
    tenant_id: r.tenant_id, tenant_name: tenantMap.get(r.tenant_id) || "Inconnu",
  }))

  finishedProducts?.forEach((f) => articles.push({
    id: f.id, name: f.name, type: "finished_product", unit: f.unit,
    currentStock: Number(f.current_stock), price: Number(f.selling_price),
    tenant_id: f.tenant_id, tenant_name: tenantMap.get(f.tenant_id) || "Inconnu",
  }))

  packaging?.forEach((p) => articles.push({
    id: p.id, name: p.name, type: "packaging", unit: p.unit,
    currentStock: Number(p.current_stock), price: Number(p.price),
    tenant_id: p.tenant_id, tenant_name: tenantMap.get(p.tenant_id) || "Inconnu",
  }))

  return articles
}

export async function adminDeleteArticle(
  tenantId: string,
  itemType: "raw_material" | "finished_product" | "packaging",
  itemId: string
): Promise<{ success: boolean }> {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const tableMap = { raw_material: "raw_materials", finished_product: "finished_products", packaging: "packaging" } as const
  const table = tableMap[itemType]

  // Get article name before deleting for confirmation
  const { data: item } = await adminClient.from(table).select("name").eq("id", itemId).single()
  if (!item) throw new Error("Article introuvable")

  // Clean up related data
  const fkColumn = itemType === "raw_material" ? "raw_material_id" : itemType === "finished_product" ? "finished_product_id" : "packaging_id"

  // Delete stock movements
  await adminClient.from("stock_movements").delete().eq(fkColumn, itemId)

  // Delete recipe ingredients (for raw materials)
  if (itemType === "raw_material") {
    await adminClient.from("recipe_ingredients").delete().eq("raw_material_id", itemId)
  }

  // Delete finished product packaging links
  if (itemType === "finished_product") {
    await adminClient.from("finished_product_packaging").delete().eq("finished_product_id", itemId)
  }
  if (itemType === "packaging") {
    await adminClient.from("finished_product_packaging").delete().eq("packaging_id", itemId)
  }

  // Delete the article itself
  const { error } = await adminClient.from(table).delete().eq("id", itemId)
  if (error) throw new Error(error.message)

  return { success: true }
}

export async function adminUpdateArticleUnit(
  tenantId: string,
  itemType: "raw_material" | "finished_product" | "packaging",
  itemId: string,
  newUnit: string
): Promise<{ success: boolean }> {
  await requireSuperAdmin()
  const adminClient = createAdminClient()

  const tableMap = { raw_material: "raw_materials", finished_product: "finished_products", packaging: "packaging" } as const
  const table = tableMap[itemType]

  // Verify article exists
  const { data: item } = await adminClient.from(table).select("name, unit").eq("id", itemId).single()
  if (!item) throw new Error("Article introuvable")

  // Update unit on the article
  const { error } = await adminClient
    .from(table)
    .update({ unit: newUnit, updated_at: new Date().toISOString() })
    .eq("id", itemId)

  if (error) throw new Error(error.message)

  // Also update stock_movements to keep unit consistent
  const fkColumn = itemType === "raw_material" ? "raw_material_id" : itemType === "finished_product" ? "finished_product_id" : "packaging_id"
  await adminClient
    .from("stock_movements")
    .update({ unit: newUnit })
    .eq(fkColumn, itemId)

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
