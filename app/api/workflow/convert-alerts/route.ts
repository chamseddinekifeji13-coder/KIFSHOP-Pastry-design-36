import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

type RawMaterialRow = {
  id: string
  tenant_id: string
  name: string
  unit: string
  current_stock: number | string | null
  min_stock: number | string | null
  price_per_unit: number | string | null
  supplier: string | null
}

async function convertFromRawMaterials(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    materialIds: string[]
    tenantId: string
    userId: string
    priority: string
  }
): Promise<{ bonApproId: string } | { error: string; status: number }> {
  const { materialIds, tenantId, userId, priority } = params

  const { data: materials, error: materialsError } = await supabase
    .from("raw_materials")
    .select(
      "id, tenant_id, name, unit, current_stock, min_stock, price_per_unit, supplier"
    )
    .eq("tenant_id", tenantId)
    .in("id", materialIds)

  if (materialsError) {
    console.error("[convert-alerts] raw_materials lookup:", materialsError)
    return {
      error: materialsError.message,
      status: 500,
    }
  }

  const rows = (materials || []) as RawMaterialRow[]
  if (rows.length === 0) {
    return {
      error:
        "Aucune matière première ne correspond à ces sélections. Les alertes affichées viennent du stock matières premières : réessayez après sélection.",
      status: 400,
    }
  }

  const reference = `BA-${new Date().getFullYear()}-${String(
    Math.floor(Math.random() * 100000)
  ).padStart(5, "0")}`

  let estimatedTotal = 0
  const lineRows = rows.map((m) => {
    const cur = Number(m.current_stock ?? 0)
    const min = Number(m.min_stock ?? 0)
    const requested = Math.max(min - cur, 0)
    const price = Number(m.price_per_unit ?? 0)
    const lineTotal = requested * price
    estimatedTotal += lineTotal
    return { m, requested, price, lineTotal }
  })

  const { data: bon, error: bonError } = await supabase
    .from("bon_approvisionnement")
    .insert({
      tenant_id: tenantId,
      reference,
      status: "draft",
      priority,
      total_items: rows.length,
      estimated_total: estimatedTotal,
      created_by: userId,
      notes: "Créé depuis les matières premières (alertes dérivées, sans table stock_alerts)",
    })
    .select("id")
    .single()

  if (bonError || !bon) {
    console.error("[convert-alerts] bon insert:", bonError)
    return {
      error: bonError?.message || "Impossible de créer le bon d'approvisionnement",
      status: 500,
    }
  }

  const bonId = bon.id as string
  const itemsWithBon = lineRows.map(({ m, requested, price, lineTotal }) => ({
    bon_appro_id: bonId,
    stock_alert_id: null,
    item_type: "raw_material" as const,
    raw_material_id: m.id,
    item_name: m.name,
    item_unit: m.unit,
    requested_quantity: requested,
    estimated_unit_price: m.price_per_unit != null ? price : null,
    estimated_total: lineTotal,
    assigned_supplier_name: m.supplier ? String(m.supplier) : null,
    status: "pending" as const,
  }))

  const { error: itemsError } = await supabase
    .from("bon_approvisionnement_items")
    .insert(itemsWithBon)

  if (itemsError) {
    console.error("[convert-alerts] items insert:", itemsError)
    await supabase.from("bon_approvisionnement").delete().eq("id", bonId)
    return {
      error: itemsError.message,
      status: 500,
    }
  }

  const { error: auditErr } = await supabase.from("workflow_audit_log").insert({
    tenant_id: tenantId,
    entity_type: "bon_approvisionnement",
    entity_id: bonId,
    action: "created",
    new_status: "draft",
    details: {
      source: "raw_materials_fallback",
      material_ids: materialIds,
      alert_count: rows.length,
    },
    performed_by: userId,
  })
  if (auditErr) {
    console.warn("[convert-alerts] workflow_audit_log insert skipped:", auditErr.message)
  }

  return { bonApproId: bonId }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertIds, priority = "normal", userId, tenantId } = body

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: "alertIds doit être un tableau non vide" },
        { status: 400 }
      )
    }

    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json({ error: "tenantId manquant" }, { status: 400 })
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId manquant" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "convert_alerts_to_appro",
      {
        p_alert_ids: alertIds,
        p_user_id: userId,
        p_priority: priority,
      }
    )

    if (!rpcError && rpcResult != null) {
      return NextResponse.json(
        {
          success: true,
          bonApproId: rpcResult,
          message: "Alertes converties en bon d'approvisionnement",
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      )
    }

    if (rpcError) {
      console.warn(
        "[convert-alerts] RPC convert_alerts_to_appro failed, trying raw_materials fallback:",
        rpcError.message
      )
    }

    const fallback = await convertFromRawMaterials(supabase, {
      materialIds: alertIds as string[],
      tenantId: tenantId.trim(),
      userId,
      priority: String(priority),
    })

    if ("error" in fallback) {
      return NextResponse.json(
        {
          error:
            fallback.error ||
            "Impossible de convertir les alertes en bon d'approvisionnement",
        },
        { status: fallback.status }
      )
    }

    return NextResponse.json(
      {
        success: true,
        bonApproId: fallback.bonApproId,
        message: "Alertes converties en bon d'approvisionnement (matières premières)",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    )
  } catch (error) {
    console.error("Error in convert-alerts API:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur",
      },
      { status: 500 }
    )
  }
}
