import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const sessionClient = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const headerTenantId = request.headers.get("x-tenant-id")?.trim()
    const metadataTenantId =
      typeof user.user_metadata?.tenant_id === "string"
        ? user.user_metadata.tenant_id.trim()
        : ""
    const tenantId = headerTenantId || metadataTenantId

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Prefer persisted workflow alerts when the table exists.
    const { data: alerts, error: alertsError } = await supabase
      .from("stock_alerts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })

    const stockAlertsTableMissing =
      !!alertsError &&
      /Could not find the table 'public\.stock_alerts'|relation "stock_alerts" does not exist/i.test(
        alertsError.message || ""
      )

    if (alertsError && !stockAlertsTableMissing) {
      throw new Error(alertsError.message)
    }

    if (stockAlertsTableMissing) {
      // Fallback: derive alerts from raw_materials for tenants without stock_alerts table.
      const { data: materials, error: materialsError } = await supabase
        .from("raw_materials")
        .select("id, name, current_stock, min_stock, unit, tenant_id, updated_at")
        .eq("tenant_id", tenantId)

      if (materialsError) {
        throw new Error(materialsError.message)
      }

      const derivedAlerts = (materials || [])
        .filter((m) => Number(m.current_stock || 0) < Number(m.min_stock || 0))
        .map((m) => ({
          id: m.id,
          tenant_id: m.tenant_id,
          item_name: m.name,
          item_type: "raw_material",
          item_unit: m.unit,
          current_stock: Number(m.current_stock || 0),
          min_stock: Number(m.min_stock || 0),
          suggested_quantity: Math.max(Number(m.min_stock || 0) - Number(m.current_stock || 0), 0),
          severity: Number(m.current_stock || 0) <= 0 ? "critical" : "warning",
          status: "pending",
          preferred_supplier_name: undefined,
          estimated_unit_price: undefined,
          created_at: m.updated_at || new Date().toISOString(),
        }))

      return NextResponse.json(
        { success: true, alerts: derivedAlerts },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      )
    }

    return NextResponse.json(
      { success: true, alerts: alerts || [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("[Stock Alerts API Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
