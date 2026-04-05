import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { orderId, status } = body
    const tenantId = user.user_metadata?.tenant_id

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId and status are required' },
        { status: 400 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get the current order
    const { data: order, error: getError } = await adminSupabase
      .from('bon_approvisionnement')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single()

    if (getError) {
      throw new Error(getError.message)
    }

    // Update order status
    const { data: updated, error: updateError } = await adminSupabase
      .from('bon_approvisionnement')
      .update({
        status: status,
        validated_by: status === 'validated' ? user.id : order.validated_by,
        validated_at: status === 'validated' ? new Date().toISOString() : order.validated_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .select()

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Log the audit trail
    const { error: auditError } = await adminSupabase
      .from('workflow_audit_log')
      .insert([{
        tenant_id: tenantId,
        entity_type: 'bon_approvisionnement',
        entity_id: orderId,
        action: status === 'validated' ? 'validated' : 'updated',
        old_status: order.status,
        new_status: status,
        performed_by: user.id,
        details: { 
          changes: { status: status },
          updated_at: new Date().toISOString()
        }
      }])

    if (auditError) {
      console.warn('[Audit Log Error]', auditError.message)
      // Don't throw - the update was successful, just log the warning
    }

    return NextResponse.json(updated?.[0], { status: 200 })
  } catch (error) {
    console.error('[Update Procurement Order API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
