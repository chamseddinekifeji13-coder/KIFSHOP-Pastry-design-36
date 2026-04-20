"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  CrmInteraction,
  CrmReminder,
  CrmQuote,
  CrmQuoteItem,
  CrmActivityLog,
  CrmStats,
  CrmPipelineStage,
  InteractionType,
  ReminderType,
  ReminderPriority,
  QuoteStatus
} from "./crm-types"

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.is_super_admin !== true) {
    redirect("/dashboard")
  }

  const adminClient = createAdminClient()
  return { supabase: adminClient, user }
}

// =====================================================
// INTERACTIONS
// =====================================================

export async function fetchInteractions(prospectId?: string): Promise<CrmInteraction[]> {
  const { supabase } = await requireSuperAdmin()
  
  let query = supabase
    .from("crm_interactions")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (prospectId) {
    query = query.eq("prospect_id", prospectId)
  }
  
  const { data, error } = await query.limit(100)
  
  if (error) {
    console.error("Error fetching interactions:", error)
    return []
  }
  
  return (data || []).map(row => ({
    id: row.id,
    prospectId: row.prospect_id,
    type: row.type,
    direction: row.direction,
    subject: row.subject,
    content: row.content,
    durationMinutes: row.duration_minutes,
    outcome: row.outcome,
    nextAction: row.next_action,
    nextActionDate: row.next_action_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function createInteraction(data: {
  prospectId: string
  type: InteractionType
  direction?: 'inbound' | 'outbound'
  subject?: string
  content?: string
  durationMinutes?: number
  outcome?: string
  nextAction?: string
  nextActionDate?: string
}): Promise<CrmInteraction | null> {
  const { supabase, user } = await requireSuperAdmin()
  
  const { data: result, error } = await supabase
    .from("crm_interactions")
    .insert({
      prospect_id: data.prospectId,
      type: data.type,
      direction: data.direction,
      subject: data.subject,
      content: data.content,
      duration_minutes: data.durationMinutes,
      outcome: data.outcome,
      next_action: data.nextAction,
      next_action_date: data.nextActionDate,
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) {
    console.error("Error creating interaction:", error)
    return null
  }
  
  // Log activity
  await logActivity(data.prospectId, "interaction_created", `Nouvelle interaction: ${data.type}`, { interactionId: result.id })
  
  return {
    id: result.id,
    prospectId: result.prospect_id,
    type: result.type,
    direction: result.direction,
    subject: result.subject,
    content: result.content,
    durationMinutes: result.duration_minutes,
    outcome: result.outcome,
    nextAction: result.next_action,
    nextActionDate: result.next_action_date,
    createdBy: result.created_by,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  }
}

// =====================================================
// REMINDERS
// =====================================================

export async function fetchReminders(options?: {
  prospectId?: string
  status?: string
  upcoming?: boolean
  overdue?: boolean
}): Promise<CrmReminder[]> {
  const { supabase } = await requireSuperAdmin()
  
  let query = supabase
    .from("crm_reminders")
    .select(`
      *,
      platform_prospects:prospect_id (business_name)
    `)
    .order("reminder_date", { ascending: true })
  
  if (options?.prospectId) {
    query = query.eq("prospect_id", options.prospectId)
  }
  
  if (options?.status) {
    query = query.eq("status", options.status)
  }
  
  if (options?.upcoming) {
    query = query.eq("status", "pending").gte("reminder_date", new Date().toISOString())
  }
  
  if (options?.overdue) {
    query = query.eq("status", "pending").lt("reminder_date", new Date().toISOString())
  }
  
  const { data, error } = await query.limit(100)
  
  if (error) {
    console.error("Error fetching reminders:", error)
    return []
  }
  
  return (data || []).map(row => ({
    id: row.id,
    prospectId: row.prospect_id,
    interactionId: row.interaction_id,
    title: row.title,
    description: row.description,
    reminderDate: row.reminder_date,
    reminderType: row.reminder_type,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    snoozedUntil: row.snoozed_until,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    prospectName: row.platform_prospects?.business_name
  }))
}

export async function createReminder(data: {
  prospectId: string
  title: string
  description?: string
  reminderDate: string
  reminderType: ReminderType
  priority?: ReminderPriority
  interactionId?: string
}): Promise<CrmReminder | null> {
  const { supabase, user } = await requireSuperAdmin()
  
  const { data: result, error } = await supabase
    .from("crm_reminders")
    .insert({
      prospect_id: data.prospectId,
      title: data.title,
      description: data.description,
      reminder_date: data.reminderDate,
      reminder_type: data.reminderType,
      priority: data.priority || "medium",
      interaction_id: data.interactionId,
      created_by: user.id,
      assigned_to: user.id
    })
    .select()
    .single()
  
  if (error) {
    console.error("Error creating reminder:", error)
    return null
  }
  
  return {
    id: result.id,
    prospectId: result.prospect_id,
    interactionId: result.interaction_id,
    title: result.title,
    description: result.description,
    reminderDate: result.reminder_date,
    reminderType: result.reminder_type,
    priority: result.priority,
    status: result.status,
    completedAt: result.completed_at,
    snoozedUntil: result.snoozed_until,
    assignedTo: result.assigned_to,
    createdBy: result.created_by,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  }
}

export async function updateReminderStatus(id: string, status: string, snoozedUntil?: string): Promise<boolean> {
  const { supabase } = await requireSuperAdmin()
  
  const updateData: any = { status }
  
  if (status === "completed") {
    updateData.completed_at = new Date().toISOString()
  }
  
  if (status === "snoozed" && snoozedUntil) {
    updateData.snoozed_until = snoozedUntil
  }
  
  const { error } = await supabase
    .from("crm_reminders")
    .update(updateData)
    .eq("id", id)
  
  if (error) {
    console.error("Error updating reminder:", error)
    return false
  }
  
  return true
}

// =====================================================
// QUOTES
// =====================================================

export async function fetchQuotes(prospectId?: string): Promise<CrmQuote[]> {
  const { supabase } = await requireSuperAdmin()
  
  let query = supabase
    .from("crm_quotes")
    .select(`
      *,
      platform_prospects:prospect_id (business_name),
      crm_quote_items (*)
    `)
    .order("created_at", { ascending: false })
  
  if (prospectId) {
    query = query.eq("prospect_id", prospectId)
  }
  
  const { data, error } = await query.limit(100)
  
  if (error) {
    console.error("Error fetching quotes:", error)
    return []
  }
  
  return (data || []).map(row => ({
    id: row.id,
    quoteNumber: row.quote_number,
    prospectId: row.prospect_id,
    title: row.title,
    description: row.description,
    status: row.status,
    validUntil: row.valid_until,
    subtotal: parseFloat(row.subtotal) || 0,
    discountPercent: parseFloat(row.discount_percent) || 0,
    discountAmount: parseFloat(row.discount_amount) || 0,
    taxPercent: parseFloat(row.tax_percent) || 0,
    taxAmount: parseFloat(row.tax_amount) || 0,
    total: parseFloat(row.total) || 0,
    currency: row.currency,
    paymentTerms: row.payment_terms,
    notes: row.notes,
    termsConditions: row.terms_conditions,
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    prospectName: row.platform_prospects?.business_name,
    items: (row.crm_quote_items || []).map((item: any) => ({
      id: item.id,
      quoteId: item.quote_id,
      productName: item.product_name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price) || 0,
      discountPercent: parseFloat(item.discount_percent) || 0,
      total: parseFloat(item.total) || 0,
      sortOrder: item.sort_order,
      createdAt: item.created_at
    }))
  }))
}

export async function createQuote(data: {
  prospectId: string
  title: string
  description?: string
  validUntil?: string
  paymentTerms?: string
  notes?: string
  items: {
    productName: string
    description?: string
    quantity: number
    unitPrice: number
    discountPercent?: number
  }[]
}): Promise<CrmQuote | null> {
  const { supabase, user } = await requireSuperAdmin()
  
  // Generate quote number
  const { count } = await supabase
    .from("crm_quotes")
    .select("*", { count: "exact", head: true })
  
  const quoteNumber = `DEV-${String((count || 0) + 1).padStart(5, "0")}`
  
  // Calculate totals
  let subtotal = 0
  const processedItems = data.items.map((item, idx) => {
    const itemTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)
    subtotal += itemTotal
    return { ...item, total: itemTotal, sortOrder: idx }
  })
  
  const taxPercent = 19 // TVA Tunisie
  const taxAmount = subtotal * (taxPercent / 100)
  const total = subtotal + taxAmount
  
  // Create quote
  const { data: quote, error } = await supabase
    .from("crm_quotes")
    .insert({
      quote_number: quoteNumber,
      prospect_id: data.prospectId,
      title: data.title,
      description: data.description,
      valid_until: data.validUntil,
      subtotal,
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total,
      payment_terms: data.paymentTerms,
      notes: data.notes,
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) {
    console.error("Error creating quote:", error)
    return null
  }
  
  // Create quote items
  if (processedItems.length > 0) {
    await supabase
      .from("crm_quote_items")
      .insert(
        processedItems.map(item => ({
          quote_id: quote.id,
          product_name: item.productName,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_percent: item.discountPercent || 0,
          total: item.total,
          sort_order: item.sortOrder
        }))
      )
  }
  
  // Log activity
  await logActivity(data.prospectId, "quote_created", `Devis ${quoteNumber} cree`, { quoteId: quote.id, total })
  
  return {
    id: quote.id,
    quoteNumber: quote.quote_number,
    prospectId: quote.prospect_id,
    title: quote.title,
    description: quote.description,
    status: quote.status,
    validUntil: quote.valid_until,
    subtotal: parseFloat(quote.subtotal),
    discountPercent: parseFloat(quote.discount_percent),
    discountAmount: parseFloat(quote.discount_amount),
    taxPercent: parseFloat(quote.tax_percent),
    taxAmount: parseFloat(quote.tax_amount),
    total: parseFloat(quote.total),
    currency: quote.currency,
    paymentTerms: quote.payment_terms,
    notes: quote.notes,
    termsConditions: quote.terms_conditions,
    sentAt: quote.sent_at,
    viewedAt: quote.viewed_at,
    acceptedAt: quote.accepted_at,
    rejectedAt: quote.rejected_at,
    rejectionReason: quote.rejection_reason,
    createdBy: quote.created_by,
    createdAt: quote.created_at,
    updatedAt: quote.updated_at
  }
}

export async function updateQuoteStatus(id: string, status: QuoteStatus, rejectionReason?: string): Promise<boolean> {
  const { supabase } = await requireSuperAdmin()
  
  const updateData: any = { status }
  
  if (status === "sent") {
    updateData.sent_at = new Date().toISOString()
  } else if (status === "viewed") {
    updateData.viewed_at = new Date().toISOString()
  } else if (status === "accepted") {
    updateData.accepted_at = new Date().toISOString()
  } else if (status === "rejected") {
    updateData.rejected_at = new Date().toISOString()
    updateData.rejection_reason = rejectionReason
  }
  
  const { error } = await supabase
    .from("crm_quotes")
    .update(updateData)
    .eq("id", id)
  
  if (error) {
    console.error("Error updating quote:", error)
    return false
  }
  
  return true
}

// =====================================================
// ACTIVITY LOG
// =====================================================

export async function logActivity(
  prospectId: string,
  activityType: string,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin()
  
  await supabase
    .from("crm_activity_log")
    .insert({
      prospect_id: prospectId,
      activity_type: activityType,
      description,
      metadata,
      created_by: user.id
    })
}

export async function fetchActivityLog(prospectId?: string, limit = 50): Promise<CrmActivityLog[]> {
  const { supabase } = await requireSuperAdmin()
  
  let query = supabase
    .from("crm_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  
  if (prospectId) {
    query = query.eq("prospect_id", prospectId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching activity log:", error)
    return []
  }
  
  return (data || []).map(row => ({
    id: row.id,
    prospectId: row.prospect_id,
    activityType: row.activity_type,
    description: row.description,
    metadata: row.metadata,
    createdBy: row.created_by,
    createdAt: row.created_at
  }))
}

// =====================================================
// CRM STATS
// =====================================================

export async function fetchCrmStats(): Promise<CrmStats> {
  const { supabase } = await requireSuperAdmin()
  
  // Fetch all data in parallel
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const [
    { count: totalProspects },
    { count: activeProspects },
    { count: convertedThisMonth },
    { count: pendingReminders },
    { count: overdueReminders },
    { count: totalQuotes },
    { count: quotesThisMonth },
    { count: acceptedQuotes },
    { data: interactionsThisWeek },
    { data: recentActivity },
    { data: prospects },
    { data: quotes }
  ] = await Promise.all([
    supabase.from("platform_prospects").select("*", { count: "exact", head: true }),
    supabase.from("platform_prospects").select("*", { count: "exact", head: true }).not("status", "in", "(converti,perdu)"),
    supabase.from("platform_prospects").select("*", { count: "exact", head: true }).eq("status", "converti").gte("updated_at", startOfMonth),
    supabase.from("crm_reminders").select("*", { count: "exact", head: true }).eq("status", "pending").gte("reminder_date", now.toISOString()),
    supabase.from("crm_reminders").select("*", { count: "exact", head: true }).eq("status", "pending").lt("reminder_date", now.toISOString()),
    supabase.from("crm_quotes").select("*", { count: "exact", head: true }),
    supabase.from("crm_quotes").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("crm_quotes").select("*", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("crm_interactions").select("id").gte("created_at", startOfWeek),
    supabase.from("crm_activity_log").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("platform_prospects").select("status, source, created_at"),
    supabase.from("crm_quotes").select("total, status, created_at")
  ])
  
  // Calculate conversion rate
  const conversionRate = totalProspects && totalProspects > 0 
    ? Math.round(((convertedThisMonth || 0) / totalProspects) * 100) 
    : 0
  
  // Quote acceptance rate
  const quoteAcceptanceRate = totalQuotes && totalQuotes > 0
    ? Math.round(((acceptedQuotes || 0) / totalQuotes) * 100)
    : 0
  
  // Total revenue from accepted quotes
  const totalRevenue = (quotes || [])
    .filter(q => q.status === "accepted")
    .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0)
  
  // Average deal size
  const avgDealSize = acceptedQuotes && acceptedQuotes > 0
    ? totalRevenue / acceptedQuotes
    : 0

  const getExpectedValue = (row: { expected_value?: string | number | null }) => {
    const raw = row.expected_value
    if (typeof raw === "number") return raw
    if (typeof raw === "string") return parseFloat(raw) || 0
    return 0
  }
  
  // Pipeline value (expected value of active prospects)
  const pipelineValue = (prospects || [])
    .filter(p => !["converti", "perdu"].includes(p.status))
    .reduce((sum, p) => sum + getExpectedValue(p as { expected_value?: string | number | null }), 0)
  
  // Prospects by stage
  const stages = ["nouveau", "contacte", "interesse", "demo_planifiee", "negociation", "converti", "perdu"]
  const prospectsByStage = stages.map(stage => ({
    stage,
    count: (prospects || []).filter(p => p.status === stage).length,
    value: (prospects || [])
      .filter(p => p.status === stage)
      .reduce((sum, p) => sum + getExpectedValue(p as { expected_value?: string | number | null }), 0)
  }))
  
  // Top sources
  const sourceMap = new Map<string, { count: number; converted: number }>()
  for (const p of (prospects || [])) {
    const source = p.source || "other"
    const existing = sourceMap.get(source) || { count: 0, converted: 0 }
    existing.count++
    if (p.status === "converti") existing.converted++
    sourceMap.set(source, existing)
  }
  const topSources = Array.from(sourceMap.entries())
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  // Monthly trend (last 6 months)
  const monthlyTrend: { month: string; prospects: number; converted: number; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthStr = monthDate.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
    
    const monthProspects = (prospects || []).filter(p => {
      const created = new Date(p.created_at)
      return created >= monthDate && created <= monthEnd
    }).length
    
    const monthConverted = (prospects || []).filter(p => {
      const created = new Date(p.created_at)
      return p.status === "converti" && created >= monthDate && created <= monthEnd
    }).length
    
    const monthRevenue = (quotes || [])
      .filter(q => {
        const created = new Date(q.created_at)
        return q.status === "accepted" && created >= monthDate && created <= monthEnd
      })
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0)
    
    monthlyTrend.push({ month: monthStr, prospects: monthProspects, converted: monthConverted, revenue: monthRevenue })
  }
  
  return {
    totalProspects: totalProspects || 0,
    activeProspects: activeProspects || 0,
    convertedThisMonth: convertedThisMonth || 0,
    conversionRate,
    pendingReminders: pendingReminders || 0,
    overdueReminders: overdueReminders || 0,
    totalQuotes: totalQuotes || 0,
    quotesThisMonth: quotesThisMonth || 0,
    quoteAcceptanceRate,
    totalRevenue,
    avgDealSize,
    avgSalesCycle: 14, // TODO: Calculate from data
    pipelineValue,
    interactionsThisWeek: (interactionsThisWeek || []).length,
    prospectsByStage,
    recentActivity: (recentActivity || []).map(row => ({
      id: row.id,
      prospectId: row.prospect_id,
      activityType: row.activity_type,
      description: row.description,
      metadata: row.metadata,
      createdBy: row.created_by,
      createdAt: row.created_at
    })),
    topSources,
    monthlyTrend
  }
}
