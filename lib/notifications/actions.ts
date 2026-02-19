import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────────
export type NotificationType = "transfer_request" | "purchase_request" | "production_ready" | "info"
export type NotificationPriority = "low" | "normal" | "high" | "urgent"
export type NotificationStatus = "unread" | "read" | "actioned" | "dismissed"

export interface Notification {
  id: string
  tenantId: string
  type: NotificationType
  title: string
  message: string | null
  priority: NotificationPriority
  targetRole: string
  createdByUserId: string | null
  createdByName: string | null
  relatedPlanId: string | null
  relatedMaterialId: string | null
  actionUrl: string | null
  status: NotificationStatus
  createdAt: string
  readAt: string | null
}

// ─── Fetch notifications for a given role ──────────────────
export async function fetchNotifications(
  tenantId: string,
  role: string,
  limit = 50
): Promise<Notification[]> {
  const supabase = createClient()
  // Fetch notifications targeted at this role or "all"
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`target_role.eq.${role},target_role.eq.all,target_role.eq.owner,target_role.eq.gerant`)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) { console.error("Error fetching notifications:", error.message); return [] }

  return (data || []).map((n) => ({
    id: n.id,
    tenantId: n.tenant_id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    priority: n.priority as NotificationPriority,
    targetRole: n.target_role,
    createdByUserId: n.created_by_user_id,
    createdByName: n.created_by_name,
    relatedPlanId: n.related_production_plan_id,
    relatedMaterialId: n.related_material_id,
    actionUrl: n.action_url,
    status: n.status as NotificationStatus,
    createdAt: n.created_at,
    readAt: n.read_at,
  }))
}

// ─── Fetch only for specific target_role (exact match) ─────
export async function fetchNotificationsForRole(
  tenantId: string,
  targetRole: string,
  limit = 50
): Promise<Notification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("target_role", targetRole)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) { console.error("Error fetching role notifications:", error.message); return [] }

  return (data || []).map((n) => ({
    id: n.id,
    tenantId: n.tenant_id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    priority: n.priority as NotificationPriority,
    targetRole: n.target_role,
    createdByUserId: n.created_by_user_id,
    createdByName: n.created_by_name,
    relatedPlanId: n.related_production_plan_id,
    relatedMaterialId: n.related_material_id,
    actionUrl: n.action_url,
    status: n.status as NotificationStatus,
    createdAt: n.created_at,
    readAt: n.read_at,
  }))
}

// ─── Create a notification ─────────────────────────────────
export async function createNotification(tenantId: string, data: {
  type: NotificationType
  title: string
  message?: string
  priority?: NotificationPriority
  targetRole: string
  createdByUserId?: string
  createdByName?: string
  relatedPlanId?: string
  relatedMaterialId?: string
  actionUrl?: string
}): Promise<Notification | null> {
  const supabase = createClient()
  const { data: row, error } = await supabase.from("notifications").insert({
    tenant_id: tenantId,
    type: data.type,
    title: data.title,
    message: data.message || null,
    priority: data.priority || "normal",
    target_role: data.targetRole,
    created_by_user_id: data.createdByUserId || null,
    created_by_name: data.createdByName || null,
    related_production_plan_id: data.relatedPlanId || null,
    related_material_id: data.relatedMaterialId || null,
    action_url: data.actionUrl || null,
  }).select().single()

  if (error) { throw new Error(error.message) }
  if (!row) return null

  return {
    id: row.id, tenantId: row.tenant_id,
    type: row.type, title: row.title, message: row.message,
    priority: row.priority, targetRole: row.target_role,
    createdByUserId: row.created_by_user_id, createdByName: row.created_by_name,
    relatedPlanId: row.related_production_plan_id, relatedMaterialId: row.related_material_id,
    actionUrl: row.action_url, status: row.status, createdAt: row.created_at, readAt: row.read_at,
  }
}

// ─── Mark as read ──────────────────────────────────────────
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("notifications").update({
    status: "read", read_at: new Date().toISOString(),
  }).eq("id", notificationId)
}

// ─── Mark as actioned ──────────────────────────────────────
export async function markNotificationActioned(notificationId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("notifications").update({
    status: "actioned", read_at: new Date().toISOString(),
  }).eq("id", notificationId)
}

// ─── Mark all as read ──────────────────────────────────────
export async function markAllNotificationsRead(tenantId: string, role: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("notifications").update({
    status: "read", read_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId).eq("target_role", role).eq("status", "unread")
}

// ─── Dismiss notification ──────────────────────────────────
export async function dismissNotification(notificationId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("notifications").update({ status: "dismissed" }).eq("id", notificationId)
}

// ─── Count unread ──────────────────────────────────────────
export async function countUnreadNotifications(tenantId: string, role: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .or(`target_role.eq.${role},target_role.eq.all`)
    .eq("status", "unread")
  if (error) return 0
  return count || 0
}
