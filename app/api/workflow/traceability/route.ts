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

    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      )
    }

    // Get the procurement order
    const { data: order, error: orderError } = await supabase
      .from('procurement_orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', user.user_metadata?.tenant_id)
      .single()

    if (orderError) {
      throw new Error(orderError.message)
    }

    // Parse audit trail
    const auditTrail = order?.audit_trail ? JSON.parse(order.audit_trail) : []

    // Format for timeline
    const timeline = auditTrail.map((entry: any) => ({
      id: `${orderId}-${entry.timestamp}`,
      action: entry.action,
      timestamp: new Date(entry.timestamp),
      user_id: entry.user_id,
      changes: entry.changes,
      description: getActionDescription(entry.action, entry.changes)
    }))

    return NextResponse.json(
      {
        order: {
          id: order.id,
          material_name: order.material_name,
          quantity: order.quantity,
          status: order.status,
          created_at: order.created_at,
          supplier_id: order.supplier_id
        },
        timeline: timeline.reverse()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Traceability API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function getActionDescription(action: string, changes: any): string {
  const descriptions: Record<string, string> = {
    'created': 'Bon créé',
    'validated': 'Bon validé',
    'sent': 'Commande envoyée au fournisseur',
    'received': 'Commande reçue',
    'cancelled': 'Bon annulé',
    'updated': 'Bon mis à jour'
  }
  
  return descriptions[action] || action
}
