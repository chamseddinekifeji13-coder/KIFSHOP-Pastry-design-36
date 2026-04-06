import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId =
      typeof user.user_metadata?.tenant_id === "string"
        ? user.user_metadata.tenant_id.trim()
        : ""
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID not found" }, { status: 400 })
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let query = supabase
      .from('bon_approvisionnement')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(orders, { status: 200 })
  } catch (error) {
    console.error('[Procurement Orders API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId =
      typeof user.user_metadata?.tenant_id === "string"
        ? user.user_metadata.tenant_id.trim()
        : ""
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID not found" }, { status: 400 })
    }

    const body = await request.json()
    const safePriority =
      typeof body.priority === "string" &&
      ["low", "normal", "high", "urgent"].includes(body.priority)
        ? body.priority
        : "normal"
    const normalizedStatus = typeof body.status === "string" ? body.status.toLowerCase().trim() : ""
    const safeStatus =
      ["draft", "validated", "sent_to_suppliers", "partially_ordered", "fully_ordered", "cancelled"].includes(normalizedStatus)
        ? normalizedStatus
        : "draft"
    const totalItems =
      Number.isFinite(Number(body.total_items)) && Number(body.total_items) >= 0
        ? Number(body.total_items)
        : 0
    const estimatedTotal =
      Number.isFinite(Number(body.estimated_total)) && Number(body.estimated_total) >= 0
        ? Number(body.estimated_total)
        : 0

    const reference =
      typeof body.reference === "string" && body.reference.trim()
        ? body.reference.trim()
        : `BA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const legacyQty =
      Number.isFinite(Number(body.quantity)) && Number(body.quantity) > 0
        ? Number(body.quantity)
        : 0
    const legacyUnitPrice =
      Number.isFinite(Number(body.estimated_unit_price ?? body.unit_price))
        ? Number(body.estimated_unit_price ?? body.unit_price)
        : 0
    const isLegacySingleItemPayload =
      typeof body.material_name === "string" &&
      body.material_name.trim().length > 0 &&
      legacyQty > 0

    const order = {
      tenant_id: tenantId,
      reference,
      status: safeStatus,
      priority: safePriority,
      notes: typeof body.notes === "string" ? body.notes : null,
      total_items: totalItems || (isLegacySingleItemPayload ? 1 : 0),
      estimated_total:
        estimatedTotal ||
        (isLegacySingleItemPayload ? legacyQty * legacyUnitPrice : 0),
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('bon_approvisionnement')
      .insert([order])
      .select()

    if (error) {
      throw new Error(error.message)
    }

    const created = data?.[0]
    if (!created) {
      throw new Error("Creation du bon d'approvisionnement echouee")
    }

    if (isLegacySingleItemPayload) {
      const itemPayload = {
        bon_appro_id: created.id,
        item_type:
          typeof body.item_type === "string" &&
          ["raw_material", "packaging", "consumable"].includes(body.item_type)
            ? body.item_type
            : "raw_material",
        raw_material_id: body.material_id || null,
        item_name: body.material_name.trim(),
        item_unit: typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : "unite",
        requested_quantity: legacyQty,
        estimated_unit_price: legacyUnitPrice || null,
        estimated_total: legacyQty * legacyUnitPrice,
        assigned_supplier_id: body.supplier_id || null,
        assigned_supplier_name:
          typeof body.supplier_name === "string" ? body.supplier_name.trim() || null : null,
        status: "pending",
      }

      const { error: itemError } = await supabase
        .from("bon_approvisionnement_items")
        .insert(itemPayload)

      if (itemError) {
        await supabase.from("bon_approvisionnement").delete().eq("id", created.id)
        throw new Error(`Creation item legacy echouee: ${itemError.message}`)
      }

      const { data: refreshed } = await supabase
        .from("bon_approvisionnement")
        .select("*")
        .eq("id", created.id)
        .single()
      return NextResponse.json(refreshed || created, { status: 201 })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('[Create Procurement Order API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
