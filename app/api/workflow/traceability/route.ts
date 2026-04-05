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

    // Get the bon d'approvisionnement
    const { data: order, error: orderError } = await supabase
      .from('bon_approvisionnement')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', user.user_metadata?.tenant_id)
      .single()

    if (orderError) {
      throw new Error(orderError.message)
    }

    // Get audit trail from workflow_audit_log table
    const { data: auditEntries, error: auditError } = await supabase
      .from('workflow_audit_log')
      .select('*')
      .eq('entity_id', orderId)
      .eq('entity_type', 'bon_approvisionnement')
      .eq('tenant_id', user.user_metadata?.tenant_id)
      .order('performed_at', { ascending: true })

    if (auditError) {
      console.warn('[Traceability] Error fetching audit log:', auditError.message)
    }

    // Format for timeline
    const timeline = (auditEntries || []).map((entry: any) => ({
      id: entry.id,
      action: entry.action,
      timestamp: new Date(entry.performed_at),
      user_id: entry.performed_by,
      old_status: entry.old_status,
      new_status: entry.new_status,
      details: entry.details,
      description: getActionDescription(entry.action, entry.details)
    }))

    return NextResponse.json(
      {
        order: {
          id: order.id,
          reference: order.reference,
          status: order.status,
          priority: order.priority,
          total_items: order.total_items,
          estimated_total: order.estimated_total,
          created_at: order.created_at,
          validated_at: order.validated_at
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
