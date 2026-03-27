import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────────
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"
export type TicketPriority = "low" | "normal" | "high" | "urgent"
export type TicketCategory = "general" | "bug" | "billing" | "feature_request" | "account"

export interface SupportTicket {
  id: string
  tenantId: string
  createdByUserId: string
  createdByName: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  senderType: "user" | "admin" | "system"
  senderName: string
  message: string
  createdAt: string
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Resolu",
  closed: "Ferme",
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: "General",
  bug: "Bug / Probleme technique",
  billing: "Facturation / Abonnement",
  feature_request: "Demande de fonctionnalite",
  account: "Compte / Acces",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

// ─── Helpers ───────────────────────────────────────────────
function mapTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    createdByUserId: row.created_by as string,
    createdByName: row.created_by_name as string,
    subject: row.subject as string,
    category: (row.category as TicketCategory) || "general",
    priority: row.priority as TicketPriority,
    status: row.status as TicketStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapMessage(row: Record<string, unknown>): TicketMessage {
  return {
    id: row.id as string,
    ticketId: row.ticket_id as string,
    senderType: row.sender_type as "user" | "admin" | "system",
    senderName: row.sender_name as string,
    message: row.message as string,
    createdAt: row.created_at as string,
  }
}

// ─── Fetch tickets for a tenant ────────────────────────────
export async function fetchTickets(tenantId: string): Promise<SupportTicket[]> {
  if (!isUuid(tenantId)) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tickets:", error.message)
    return []
  }
  return (data || []).map(mapTicket)
}

// ─── Create a ticket ───────────────────────────────────────
export async function createTicket(data: {
  tenantId: string
  createdByUserId: string
  createdByName: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  message: string
}): Promise<SupportTicket | null> {
  if (!isUuid(data.tenantId)) {
    throw new Error("Tenant invalide. Rechargez la page puis reessayez.")
  }

  const supabase = createClient()

  // Create the ticket
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      tenant_id: data.tenantId,
      created_by: isUuid(data.createdByUserId) ? data.createdByUserId : null,
      created_by_name: data.createdByName,
      subject: data.subject,
      description: data.message,
      category: data.category,
      priority: data.priority,
      status: "open",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating ticket:", error.message)
    throw new Error(error.message)
  }
  if (!ticket) return null

  // Add the first message
  await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "user",
    sender_name: data.createdByName,
    message: data.message,
  })

  return mapTicket(ticket)
}

// ─── Fetch messages for a ticket ───────────────────────────
export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  if (!isUuid(ticketId)) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching ticket messages:", error.message)
    return []
  }
  return (data || []).map(mapMessage)
}

// ─── Send a message on a ticket ────────────────────────────
export async function sendTicketMessage(data: {
  ticketId: string
  senderType: "user" | "admin"
  senderName: string
  message: string
}): Promise<TicketMessage | null> {
  if (!isUuid(data.ticketId)) {
    throw new Error("Ticket invalide.")
  }

  const supabase = createClient()

  const { data: msg, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: data.ticketId,
      sender_type: data.senderType,
      sender_name: data.senderName,
      message: data.message,
    })
    .select()
    .single()

  if (error) {
    console.error("Error sending message:", error.message)
    throw new Error(error.message)
  }

  // Update ticket timestamp
  await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.ticketId)

  return msg ? mapMessage(msg) : null
}

// ─── Count open tickets for a tenant ───────────────────────
export async function countOpenTickets(tenantId: string): Promise<number> {
  if (!isUuid(tenantId)) return 0
  const supabase = createClient()
  const { count, error } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["open", "in_progress"])

  if (error) return 0
  return count || 0
}
