"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export interface ClientData {
  id: string
  phone: string
  name: string | null
  status: "normal" | "vip" | "warning" | "blacklisted"
  return_count: number
  total_orders: number
  total_spent: number
  notes: string | null
  created_at: string
}

interface UseClientStatusReturn {
  client: ClientData | null
  isLoading: boolean
  error: string | null
  isNewClient: boolean
  isBlocked: boolean
  hasExcessiveReturns: boolean
  statusColor: string
  statusLabel: string
  lookupClient: (phone: string, tenantId: string) => Promise<ClientData | null>
  resetReturns: (clientId: string) => Promise<void>
  clearClient: () => void
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  vip: { color: "text-emerald-600", label: "VIP" },
  warning: { color: "text-amber-500", label: "Attention" },
  blacklisted: { color: "text-red-500", label: "Blackliste" },
  normal: { color: "text-muted-foreground", label: "Normal" },
}

export function useClientStatus(): UseClientStatusReturn {
  const [client, setClient] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewClient, setIsNewClient] = useState(false)

  const isBlocked = client?.status === "blacklisted"
  const hasExcessiveReturns = (client?.return_count ?? 0) >= 2

  const config = STATUS_CONFIG[client?.status ?? "normal"] ?? STATUS_CONFIG.normal
  const statusColor = config.color
  const statusLabel = config.label

  const lookupClient = useCallback(async (phone: string, tenantId: string): Promise<ClientData | null> => {
    setIsLoading(true)
    setError(null)
    setIsNewClient(false)

    try {
      const supabase = createClient()
      const cleanPhone = phone.replace(/\s/g, "").trim()

      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("phone", cleanPhone)
        .maybeSingle()

      if (fetchError) {
        setError("Erreur de recherche client")
        setClient(null)
        return null
      }

      if (data) {
        const clientData: ClientData = {
          ...data,
          total_spent: Number(data.total_spent),
        }
        setClient(clientData)
        return clientData
      }

      // Auto-create new client
      const { data: newClient, error: createError } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          phone: cleanPhone,
          status: "normal",
          return_count: 0,
          total_orders: 0,
          total_spent: 0,
        })
        .select()
        .single()

      if (createError) {
        setError("Erreur de creation client")
        setClient(null)
        return null
      }

      const newClientData: ClientData = {
        ...newClient,
        total_spent: Number(newClient.total_spent),
      }
      setClient(newClientData)
      setIsNewClient(true)
      return newClientData
    } catch {
      setError("Erreur reseau")
      setClient(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetReturns = useCallback(async (clientId: string) => {
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("clients")
      .update({ return_count: 0, status: "normal", updated_at: new Date().toISOString() })
      .eq("id", clientId)

    if (!updateError && client) {
      setClient({ ...client, return_count: 0, status: "normal" })
    }
  }, [client])

  const clearClient = useCallback(() => {
    setClient(null)
    setError(null)
    setIsNewClient(false)
  }, [])

  return {
    client,
    isLoading,
    error,
    isNewClient,
    isBlocked,
    hasExcessiveReturns,
    statusColor,
    statusLabel,
    lookupClient,
    resetReturns,
    clearClient,
  }
}
