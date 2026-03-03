import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────

export interface SalesChannelRow {
  id: string
  tenant_id: string
  type: string
  enabled: boolean
  contact: string
  auto_reply: string
  notify_on_order: boolean
  notify_on_message: boolean
  open_hour: string
  close_hour: string
  quick_replies: string[]
  created_at: string
  updated_at: string
}

export interface SalesChannelConfig {
  id: string | null
  channelType: string
  enabled: boolean
  contact: string
  autoReply: string
  notifyOnOrder: boolean
  notifyOnMessage: boolean
  openHour: string
  closeHour: string
  quickReplies: string[]
}

// Channel definitions (static)
export const CHANNEL_DEFINITIONS = [
  { type: "whatsapp", name: "WhatsApp", defaultEnabled: false },
  { type: "phone", name: "Telephone", defaultEnabled: false },
  { type: "web", name: "Boutique en ligne", defaultEnabled: false },
  { type: "instagram", name: "Instagram", defaultEnabled: false },
  { type: "tiktok", name: "TikTok", defaultEnabled: false },
  { type: "messenger", name: "Messenger", defaultEnabled: false },
] as const

// ─── Fetch channels ───────────────────────────────────────────

export async function fetchSalesChannels(tenantId: string): Promise<SalesChannelConfig[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("sales_channels")
    .select("*")
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Error fetching sales channels:", error.message)
  }

  const rows: SalesChannelRow[] = data || []
  const rowMap = new Map(rows.map(r => [r.type, r]))

  // Return all 6 channels, merging DB data with defaults
  return CHANNEL_DEFINITIONS.map(def => {
    const row = rowMap.get(def.type)
    if (row) {
      return {
        id: row.id,
        channelType: row.type,
        enabled: row.enabled,
        contact: row.contact,
        autoReply: row.auto_reply,
        notifyOnOrder: row.notify_on_order,
        notifyOnMessage: row.notify_on_message,
        openHour: row.open_hour,
        closeHour: row.close_hour,
        quickReplies: Array.isArray(row.quick_replies) ? row.quick_replies : [],
      }
    }
    return {
      id: null,
      channelType: def.type,
      enabled: def.defaultEnabled,
      contact: "",
      autoReply: "",
      notifyOnOrder: true,
      notifyOnMessage: true,
      openHour: "08:00",
      closeHour: "18:00",
      quickReplies: def.type === "whatsapp" ? [
        "Voici notre catalogue: consultez notre site!",
        "Votre commande est en preparation!",
        "Votre commande est prete au retrait.",
        "Livraison prevue aujourd'hui entre 14h-18h.",
      ] : [],
    }
  })
}

// ─── Upsert channel config ───────────────────────────────────

export async function upsertSalesChannel(
  tenantId: string,
  config: {
    channelType: string
    enabled: boolean
    contact: string
    autoReply: string
    notifyOnOrder: boolean
    notifyOnMessage: boolean
    openHour: string
    closeHour: string
    quickReplies: string[]
  }
): Promise<{ success: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  // Resolve the display name from CHANNEL_DEFINITIONS
  const channelName = CHANNEL_DEFINITIONS.find(d => d.type === config.channelType)?.name ?? config.channelType

  const row = {
    tenant_id: tenantId,
    type: config.channelType,
    name: channelName,
    enabled: config.enabled,
    contact: config.contact,
    auto_reply: config.autoReply,
    notify_on_order: config.notifyOnOrder,
    notify_on_message: config.notifyOnMessage,
    open_hour: config.openHour,
    close_hour: config.closeHour,
    quick_replies: config.quickReplies,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("sales_channels")
    .upsert(row, { onConflict: "tenant_id,type" })

  if (error) throw new Error(error.message)
  return { success: true }
}

// ─── Toggle channel enabled/disabled ─────────────────────────

export async function toggleSalesChannel(
  tenantId: string,
  channelType: string,
  enabled: boolean
): Promise<{ success: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  // Resolve the display name from CHANNEL_DEFINITIONS
  const channelName = CHANNEL_DEFINITIONS.find(d => d.type === channelType)?.name ?? channelType

  const { error } = await supabase
    .from("sales_channels")
    .upsert(
      {
        tenant_id: tenantId,
        type: channelType,
        name: channelName,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,type" }
    )

  if (error) throw new Error(error.message)
  return { success: true }
}
