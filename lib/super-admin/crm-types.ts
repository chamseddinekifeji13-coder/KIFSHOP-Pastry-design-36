// CRM Types for KIFSHOP Commercial Platform

// Interaction types
export type InteractionType = 'call' | 'email' | 'meeting' | 'demo' | 'whatsapp' | 'note' | 'other'
export type InteractionDirection = 'inbound' | 'outbound'

export interface CrmInteraction {
  id: string
  prospectId: string
  type: InteractionType
  direction?: InteractionDirection
  subject?: string
  content?: string
  durationMinutes?: number
  outcome?: string
  nextAction?: string
  nextActionDate?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// Reminder types
export type ReminderType = 'call' | 'email' | 'meeting' | 'follow_up' | 'demo' | 'other'
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ReminderStatus = 'pending' | 'completed' | 'cancelled' | 'snoozed'

export interface CrmReminder {
  id: string
  prospectId: string
  interactionId?: string
  title: string
  description?: string
  reminderDate: string
  reminderType: ReminderType
  priority: ReminderPriority
  status: ReminderStatus
  completedAt?: string
  snoozedUntil?: string
  assignedTo?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Joined data
  prospectName?: string
}

// Quote types
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'negotiating'

export interface CrmQuote {
  id: string
  quoteNumber: string
  prospectId: string
  title: string
  description?: string
  status: QuoteStatus
  validUntil?: string
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  total: number
  currency: string
  paymentTerms?: string
  notes?: string
  termsConditions?: string
  sentAt?: string
  viewedAt?: string
  acceptedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Joined data
  prospectName?: string
  items?: CrmQuoteItem[]
}

export interface CrmQuoteItem {
  id: string
  quoteId: string
  productName: string
  description?: string
  quantity: number
  unitPrice: number
  discountPercent: number
  total: number
  sortOrder: number
  createdAt: string
}

// Pipeline stage
export interface CrmPipelineStage {
  id: string
  name: string
  description?: string
  color: string
  probability: number
  sortOrder: number
  isWon: boolean
  isLost: boolean
  createdAt: string
}

// Document types
export type DocumentCategory = 'quote' | 'contract' | 'presentation' | 'brochure' | 'other'

export interface CrmDocument {
  id: string
  prospectId: string
  quoteId?: string
  name: string
  fileUrl: string
  fileType?: string
  fileSize?: number
  category: DocumentCategory
  uploadedBy?: string
  createdAt: string
}

// Activity log
export interface CrmActivityLog {
  id: string
  prospectId: string
  activityType: string
  description: string
  metadata?: Record<string, any>
  createdBy?: string
  createdAt: string
}

// Labels and colors
export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Appel',
  email: 'Email',
  meeting: 'Reunion',
  demo: 'Demo',
  whatsapp: 'WhatsApp',
  note: 'Note',
  other: 'Autre'
}

export const INTERACTION_TYPE_ICONS: Record<InteractionType, string> = {
  call: 'Phone',
  email: 'Mail',
  meeting: 'Users',
  demo: 'Monitor',
  whatsapp: 'MessageCircle',
  note: 'FileText',
  other: 'MoreHorizontal'
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  call: 'Appeler',
  email: 'Envoyer email',
  meeting: 'Reunion',
  follow_up: 'Relance',
  demo: 'Demo',
  other: 'Autre'
}

export const REMINDER_PRIORITY_LABELS: Record<ReminderPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente'
}

export const REMINDER_PRIORITY_COLORS: Record<ReminderPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700'
}

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: 'En attente',
  completed: 'Termine',
  cancelled: 'Annule',
  snoozed: 'Reporte'
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoye',
  viewed: 'Consulte',
  accepted: 'Accepte',
  rejected: 'Refuse',
  expired: 'Expire',
  negotiating: 'En negociation'
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
  negotiating: 'bg-amber-100 text-amber-700'
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  quote: 'Devis',
  contract: 'Contrat',
  presentation: 'Presentation',
  brochure: 'Brochure',
  other: 'Autre'
}

// CRM Stats for dashboard
export interface CrmStats {
  totalProspects: number
  activeProspects: number
  convertedThisMonth: number
  conversionRate: number
  pendingReminders: number
  overdueReminders: number
  totalQuotes: number
  quotesThisMonth: number
  quoteAcceptanceRate: number
  totalRevenue: number
  avgDealSize: number
  avgSalesCycle: number // days
  pipelineValue: number
  interactionsThisWeek: number
  prospectsByStage: { stage: string; count: number; value: number }[]
  recentActivity: CrmActivityLog[]
  topSources: { source: string; count: number; converted: number }[]
  monthlyTrend: { month: string; prospects: number; converted: number; revenue: number }[]
}
