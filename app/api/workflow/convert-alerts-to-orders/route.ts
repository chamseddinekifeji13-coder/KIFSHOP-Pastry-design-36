import { NextRequest, NextResponse } from 'next/server'
import { createClient, getTenantIdFromUser } from '@/lib/supabase/server'
import { formatWorkflowDbError } from '@/lib/workflow/db-errors'

type RawMaterialRow = {
  id: string
  tenant_id: string
  name: string
  unit: string
  current_stock: number | string | null
  min_stock: number | string | null
  price_per_unit: number | string | null
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

    const tenantId = await getTenantIdFromUser()
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      )
    }
    const priority = 'normal'

    // Get all raw_materials below their minimum stock for the tenant
    const { data: materials, error: materialsError } = await supabase
      .from('raw_materials')
      .select('id, name, current_stock, min_stock, unit, tenant_id, price_per_unit')
      .lt('current_stock', 'min_stock')
      .eq('tenant_id', tenantId)

    if (materialsError) {
      throw new Error(materialsError.message)
    }

    if (!materials || materials.length === 0) {
      return NextResponse.json(
        { message: 'Aucune alerte à convertir', count: 0 },
        { status: 200 }
      )
    }

    const rows = (materials || []) as RawMaterialRow[]
    
    // Generate a unique reference
    const reference = `BA-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 100000)
    ).padStart(5, '0')}`

    // Calculate estimated total and line items
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

    // Create bon d'approvisionnement
    const { data: bon, error: bonError } = await supabase
      .from('bon_approvisionnement')
      .insert({
        tenant_id: tenantId,
        reference,
        status: 'draft',
        priority,
        total_items: rows.length,
        estimated_total: estimatedTotal,
        created_by: user.id,
        notes: 'Créé automatiquement depuis les matières premières en rupture de stock',
      })
      .select('id')
      .single()

    if (bonError || !bon) {
      throw new Error(bonError?.message || 'Impossible de créer le bon d\'approvisionnement')
    }

    const bonId = bon.id as string

    // Create items for the bon
    const items = lineRows.map(({ m, requested, price, lineTotal }) => ({
      bon_appro_id: bonId,
      stock_alert_id: null,
      item_type: 'raw_material' as const,
      raw_material_id: m.id,
      item_name: m.name,
      item_unit: m.unit,
      requested_quantity: requested,
      estimated_unit_price: m.price_per_unit != null ? price : null,
      estimated_total: lineTotal,
      assigned_supplier_name: null,
      status: 'pending' as const,
    }))

    const { error: itemsError } = await supabase
      .from('bon_approvisionnement_items')
      .insert(items)

    if (itemsError) {
      // Rollback: delete the bon if items creation fails
      await supabase.from('bon_approvisionnement').delete().eq('id', bonId)
      throw new Error(itemsError.message)
    }

    // Log the action
    await supabase.from('workflow_audit_log').insert({
      tenant_id: tenantId,
      entity_type: 'bon_approvisionnement',
      entity_id: bonId,
      action: 'created',
      new_status: 'draft',
      details: {
        source: 'auto_convert_low_stock',
        material_count: rows.length,
        material_ids: rows.map(m => m.id),
      },
      performed_by: user.id,
    })

    return NextResponse.json(
      { message: `${rows.length} alertes converties en bons d'approvisionnement`, count: rows.length, bonApproId: bonId },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Workflow API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
