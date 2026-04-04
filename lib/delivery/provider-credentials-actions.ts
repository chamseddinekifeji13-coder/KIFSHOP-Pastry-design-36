/**
 * Delivery Provider Credentials Actions
 * Server-side actions for managing API credentials
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { DeliveryProviderCode, DeliveryProviderCredentials } from "@/lib/delivery/types"

export async function fetchProviderCredentials(
  tenantId: string,
  providerCode?: DeliveryProviderCode
) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("delivery_provider_credentials")
      .select("*")
      .eq("tenant_id", tenantId)

    if (providerCode) {
      query = query.eq("provider_code", providerCode)
    }

    const { data, error } = await query

    if (error) {
      // Table doesn't exist yet, return empty array
      if (error.code === "PGRST116") {
        console.log("delivery_provider_credentials table not yet created")
        return []
      }
      console.error("Error fetching provider credentials:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching provider credentials:", error)
    return []
  }
}

export async function createProviderCredentials(
  tenantId: string,
  credentials: Omit<DeliveryProviderCredentials, "id" | "tenant_id" | "created_at" | "updated_at">
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("delivery_provider_credentials")
      .insert({
        tenant_id: tenantId,
        ...credentials,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating provider credentials:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error creating provider credentials:", error)
    return null
  }
}

export async function updateProviderCredentials(
  tenantId: string,
  providerCode: DeliveryProviderCode,
  updates: Partial<Omit<DeliveryProviderCredentials, "id" | "tenant_id" | "created_at" | "updated_at">>
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("delivery_provider_credentials")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("provider_code", providerCode)
      .select()
      .single()

    if (error) {
      console.error("Error updating provider credentials:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error updating provider credentials:", error)
    return null
  }
}

export async function deleteProviderCredentials(
  tenantId: string,
  providerCode: DeliveryProviderCode
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("delivery_provider_credentials")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("provider_code", providerCode)

    if (error) {
      console.error("Error deleting provider credentials:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting provider credentials:", error)
    return false
  }
}

export async function setDefaultProvider(
  tenantId: string,
  providerCode: DeliveryProviderCode
) {
  try {
    const supabase = await createClient()

    // First, unset all other defaults
    await supabase
      .from("delivery_provider_credentials")
      .update({ is_default: false })
      .eq("tenant_id", tenantId)

    // Then set the new default
    const { data, error } = await supabase
      .from("delivery_provider_credentials")
      .update({ is_default: true })
      .eq("tenant_id", tenantId)
      .eq("provider_code", providerCode)
      .select()
      .single()

    if (error) {
      console.error("Error setting default provider:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error setting default provider:", error)
    return null
  }
}

export async function testProviderConnection(
  tenantId: string,
  providerCode: DeliveryProviderCode
) {
  try {
    const credentials = await fetchProviderCredentials(tenantId, providerCode)

    if (!credentials || credentials.length === 0) {
      return { success: false, message: "Provider credentials not found" }
    }

    // Call the test endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/delivery/test-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_code: providerCode,
        credentials: credentials[0],
      }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error testing connection:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection test failed",
    }
  }
}
