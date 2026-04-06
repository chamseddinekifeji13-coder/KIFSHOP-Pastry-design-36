import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withSession, badRequestResponse, serverErrorResponse } from "@/lib/api-helpers"
import { UnifiedDeliveryService } from "@/lib/delivery/service"
import { DeliveryProviderCode } from "@/lib/delivery/types"

type ExportBatchBody = {
  /** Si absent, toutes les commandes livraison correspondant aux statuts. */
  orderIds?: string[]
  statuses?: Array<"pret" | "en-livraison">
  onlyToday?: boolean
}

function getTunisDayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Export a single order to Best Delivery API
 */
async function exportOrderToBestDeliveryApi({
  supabase,
  tenantId,
  apiBase,
  apiKey,
  apiSecret,
  orderId,
}: {
  supabase: any
  tenantId: string
  apiBase: string
  apiKey: string
  apiSecret: string
  orderId: string
}) {
  try {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, order_number_display, customer_name, customer_phone, customer_address,
        gouvernorat, delegation, total, deposit, shipping_cost, delivery_type,
        items:order_items(product_id, name, quantity, price)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { ok: false, orderId: orderId, error: `Order not found: ${orderError?.message || 'Unknown error'}` }
    }

    // Use UnifiedDeliveryService to send order
    const deliveryService = new UnifiedDeliveryService(tenantId)
    const result = await deliveryService.sendToDeliveryProvider({
      order_id: order.id,
      order_number: order.order_number_display || order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      customer_city: order.gouvernorat,
      customer_governorate: order.gouvernorat,
      customer_postal_code: '',
      total_weight: 1, // Default weight
      items_description: order.items?.map((item: any) => item.name).join(', ') || 'Order items',
      delivery_type: 'standard',
      cod_amount: Math.max(0, Number(order.total) - Number(order.deposit || 0)),
    }, 'best_delivery')

    if (result.success) {
      // Update order with tracking number
      await supabase
        .from('orders')
        .update({
          tracking_number: result.tracking_number,
          delivery_provider: 'best_delivery',
          delivery_provider_shipment_id: result.provider_shipment_id,
          status: 'en-livraison'
        })
        .eq('id', orderId)

      return {
        ok: true,
        orderId: orderId,
        shipmentId: result.provider_shipment_id,
        trackingNumber: result.tracking_number
      }
    } else {
      return { ok: false, error: result.message }
    }
  } catch (error) {
    console.error('[Export Order API]', error)
    return { ok: false, orderId: orderId, error: error instanceof Error ? error.message : 'Unknown error' }
  }
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
  const onlyToday = body.onlyToday ?? true
  const todayKey = getTunisDayKey(new Date())

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
        .select("id, delivery_type, status, ready_at, delivery_date, created_at")
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
            statusSet.has(r.status as "pret" | "en-livraison") &&
            (!onlyToday || getTunisDayKey(r.ready_at || r.delivery_date || r.created_at) === todayKey),
        )
        .map((r) => r.id)
    } else {
      const { data: rows, error: qErr } = await supabase
        .from("orders")
        .select("id, ready_at, delivery_date, created_at")
        .eq("tenant_id", session.tenantId)
        .eq("delivery_type", "delivery")
        .in("status", statuses)

      if (qErr) {
        return NextResponse.json(
          { error: `Erreur lecture commandes: ${qErr.message}` },
          { status: 500 },
        )
      }

      candidateIds = (rows || [])
        .filter((r) => !onlyToday || getTunisDayKey(r.ready_at || r.delivery_date || r.created_at) === todayKey)
        .map((r) => r.id)
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
