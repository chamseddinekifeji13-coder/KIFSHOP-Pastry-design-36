import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withSession, badRequestResponse, serverErrorResponse } from "@/lib/api-helpers"
import { exportOrderToBestDeliveryApi } from "@/lib/delivery/best-delivery-shipment-export"

type ExportBatchBody = {
  /** Si absent, toutes les commandes livraison correspondant aux statuts. */
  orderIds?: string[]
  statuses?: Array<"pret" | "en-livraison">
}

export async function POST(request: Request) {
  const [session, authError] = await withSession()
  if (authError) return authError
  if (!session) {
    return NextResponse.json({ error: "Session non trouvee" }, { status: 401 })
  }

  let body: ExportBatchBody
  try {
    body = (await request.json()) as ExportBatchBody
  } catch {
    return badRequestResponse("Corps JSON invalide")
  }

  /** Sans statuts explicites : uniquement « Prêt », pour ne pas traiter toute la base. */
  const statuses = body.statuses?.length
    ? body.statuses
    : (["pret"] as const)

  const apiBase = process.env.BEST_DELIVERY_API_URL
  if (!apiBase) {
    return NextResponse.json(
      { error: "BEST_DELIVERY_API_URL manquant sur le serveur" },
      { status: 500 },
    )
  }

  try {
    const supabase = createAdminClient()

    const { data: config, error: configError } = await supabase
      .from("best_delivery_config")
      .select("api_key, api_secret, enabled")
      .eq("tenant_id", session.tenantId)
      .maybeSingle()

    if (configError) {
      return NextResponse.json(
        { error: `Erreur lecture config livraison: ${configError.message}` },
        { status: 500 },
      )
    }

    if (!config || !config.enabled) {
      return NextResponse.json(
        { error: "Configuration Best Delivery absente ou desactivee" },
        { status: 400 },
      )
    }

    let candidateIds: string[]

    if (body.orderIds && body.orderIds.length > 0) {
      const { data: rows, error: qErr } = await supabase
        .from("orders")
        .select("id, delivery_type, status")
        .eq("tenant_id", session.tenantId)
        .in("id", body.orderIds)

      if (qErr) {
        return NextResponse.json(
          { error: `Erreur lecture commandes: ${qErr.message}` },
          { status: 500 },
        )
      }

      const statusSet = new Set(statuses)
      candidateIds = (rows || [])
        .filter(
          (r) =>
            r.delivery_type === "delivery" &&
            r.status &&
            statusSet.has(r.status as "pret" | "en-livraison"),
        )
        .map((r) => r.id)
    } else {
      const { data: rows, error: qErr } = await supabase
        .from("orders")
        .select("id")
        .eq("tenant_id", session.tenantId)
        .eq("delivery_type", "delivery")
        .in("status", statuses)

      if (qErr) {
        return NextResponse.json(
          { error: `Erreur lecture commandes: ${qErr.message}` },
          { status: 500 },
        )
      }

      candidateIds = (rows || []).map((r) => r.id)
    }

    if (candidateIds.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        ok: 0,
        failed: 0,
        results: [] as Array<{ orderId: string; ok: boolean; shipmentId?: string | null; error?: string }>,
      })
    }

    const results: Array<{
      orderId: string
      ok: boolean
      shipmentId?: string | null
      error?: string
    }> = []

    for (const oid of candidateIds) {
      try {
        const result = await exportOrderToBestDeliveryApi({
          supabase,
          tenantId: session.tenantId,
          apiBase,
          apiKey: config.api_key,
          apiSecret: config.api_secret,
          orderId: oid,
        })

        if (result.ok) {
          results.push({
            orderId: result.orderId,
            ok: true,
            shipmentId: result.shipmentId,
          })
        } else {
          results.push({
            orderId: result.orderId,
            ok: false,
            error:
              (result.responseData && JSON.stringify(result.responseData)) ||
              result.rawText ||
              `HTTP ${result.httpStatus}`,
          })
        }
      } catch (e) {
        results.push({
          orderId: oid,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }

    const ok = results.filter((r) => r.ok).length
    const failed = results.length - ok

    return NextResponse.json({
      success: failed === 0,
      total: results.length,
      ok,
      failed,
      results,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
