import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get all stock alerts for the tenant
    const { data: alerts, error: alertsError } = await supabase
      .from('raw_materials')
      .select('id, name, current_stock, min_stock, unit, tenant_id')
      .lt('current_stock', 'min_stock')
      .eq('tenant_id', user.user_metadata?.tenant_id)

    if (alertsError) {
      throw new Error(alertsError.message)
    }

    // Create procurement orders for each alert
    const orders = alerts?.map(alert => ({
      tenant_id: user.user_metadata?.tenant_id,
      material_id: alert.id,
      material_name: alert.name,
      quantity: Math.ceil(alert.min_stock * 1.5 - alert.current_stock),
      unit: alert.unit,
      status: 'DRAFT',
      created_by: user.id,
      audit_trail: JSON.stringify([{
        action: 'created',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        changes: { status: 'DRAFT' }
      }])
    })) || []

    if (orders.length === 0) {
      return NextResponse.json(
        { message: 'Aucune alerte à convertir', count: 0 },
        { status: 200 }
      )
    }

    const { error: insertError } = await supabase
      .from('procurement_orders')
      .insert(orders)

    if (insertError) {
      throw new Error(insertError.message)
    }

    return NextResponse.json(
      { message: `${orders.length} alertes converties en bons d'approvisionnement`, count: orders.length },
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
