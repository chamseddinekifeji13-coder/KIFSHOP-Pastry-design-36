// Shared types and constants for platform prospects (importable from both client and server)

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
  demoScheduledAt: string | null
  demoContactPerson: string | null
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

export const PIPELINE_ORDER: ProspectStatus[] = [
  "nouveau", "contacte", "interesse", "demo_planifiee", "negociation", "converti", "perdu"
]
