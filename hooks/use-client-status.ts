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
  // Best Delivery stats
  delivery_count?: number
  delivery_returned?: number
  delivery_total?: number
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
        // Also fetch delivery stats from best_delivery_shipments
        const { data: deliveryStats } = await supabase
          .from("best_delivery_shipments")
          .select("status, price")
          .eq("tenant_id", tenantId)
          .eq("customer_phone", cleanPhone)

        let deliveryCount = 0
        let deliveryReturned = 0
        let deliveryTotal = 0

        // Helper to check status (handles both normalized and CSV formats)
        const isDelivered = (status: string) => {
          const s = status?.toLowerCase() || ""
          return s === "delivered" || s === "livree" || s === "livré" || s.startsWith("livr")
        }
        const isReturned = (status: string) => {
          const s = status?.toLowerCase() || ""
          return s === "returned" || s === "retour"
        }

        if (deliveryStats && deliveryStats.length > 0) {
          console.log("[v0] Found delivery stats for phone:", cleanPhone, "count:", deliveryStats.length)
          console.log("[v0] Sample statuses:", deliveryStats.slice(0, 3).map(s => s.status))
          
          deliveryStats.forEach((shipment) => {
            if (isDelivered(shipment.status)) {
              deliveryCount++
              deliveryTotal += Number(shipment.price) || 0
            } else if (isReturned(shipment.status)) {
              deliveryReturned++
            }
          })
          console.log("[v0] Delivery count:", deliveryCount, "returned:", deliveryReturned)
        } else {
          console.log("[v0] No delivery stats found for phone:", cleanPhone)
        }

        const clientData: ClientData = {
          ...data,
          total_spent: Number(data.total_spent),
          delivery_count: deliveryCount,
          delivery_returned: deliveryReturned,
          delivery_total: deliveryTotal,
        }
        setClient(clientData)
        return clientData
      }

      // Check best_delivery_shipments for existing data before creating new client
      const { data: existingShipments } = await supabase
        .from("best_delivery_shipments")
        .select("customer_name, status, price")
        .eq("tenant_id", tenantId)
        .eq("customer_phone", cleanPhone)

      let customerName: string | null = null
      let deliveryCount = 0
      let deliveryReturned = 0
      let deliveryTotal = 0

      // Helper to check status (handles both normalized and CSV formats)
      const isDeliveredStatus = (status: string) => {
        const s = status?.toLowerCase() || ""
        return s === "delivered" || s === "livree" || s === "livré" || s.startsWith("livr")
      }
      const isReturnedStatus = (status: string) => {
        const s = status?.toLowerCase() || ""
        return s === "returned" || s === "retour"
      }

      if (existingShipments && existingShipments.length > 0) {
        console.log("[v0] Found existing shipments for phone:", cleanPhone, "count:", existingShipments.length)
        console.log("[v0] Sample shipments:", existingShipments.slice(0, 3))
        
        // Get the most recent name
        customerName = existingShipments[0].customer_name || null
        
        existingShipments.forEach((shipment) => {
          if (isDeliveredStatus(shipment.status)) {
            deliveryCount++
            deliveryTotal += Number(shipment.price) || 0
          } else if (isReturnedStatus(shipment.status)) {
            deliveryReturned++
          }
        })
        console.log("[v0] Calculated - name:", customerName, "delivery:", deliveryCount, "returned:", deliveryReturned)
      } else {
        console.log("[v0] No shipments found for phone:", cleanPhone)
      }

      // Auto-create new client with data from shipments if available
      const { data: newClient, error: createError } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          phone: cleanPhone,
          name: customerName,
          status: "normal",
          return_count: deliveryReturned,
          total_orders: deliveryCount,
          total_spent: deliveryTotal,
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
        delivery_count: deliveryCount,
        delivery_returned: deliveryReturned,
        delivery_total: deliveryTotal,
      }
      setClient(newClientData)
      setIsNewClient(existingShipments?.length === 0)
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
