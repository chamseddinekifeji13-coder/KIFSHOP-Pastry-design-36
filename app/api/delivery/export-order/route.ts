import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withSession, badRequestResponse, serverErrorResponse } from "@/lib/api-helpers"
import { exportOrderToBestDeliveryApi } from "@/lib/delivery/best-delivery-shipment-export"

type ExportOrderBody = {
  orderId?: string
}

export async function POST(request: Request) {
  const [session, authError] = await withSession()
  if (authError) return authError
  if (!session) {
    return NextResponse.json({ error: "Session non trouvee" }, { status: 401 })
  }

  let body: ExportOrderBody
  try {
    body = (await request.json()) as ExportOrderBody
  } catch {
    return badRequestResponse("Corps JSON invalide")
  }

  const orderId = body?.orderId?.trim()
  if (!orderId) {
    return badRequestResponse("orderId est requis")
  }

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

    const result = await exportOrderToBestDeliveryApi({
      supabase,
      tenantId: session.tenantId,
      apiBase,
      apiKey: config.api_key,
      apiSecret: config.api_secret,
      orderId,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Export API echoue",
          details: result.responseData || result.rawText || `HTTP ${result.httpStatus}`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      shipmentId: result.shipmentId,
      response: result.responseData,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
