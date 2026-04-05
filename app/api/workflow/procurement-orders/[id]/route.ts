import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function logWorkflowAction(
  entityType: string,
  entityId: string,
  action: string,
  oldStatus: string | undefined,
  newStatus: string | undefined,
  details: Record<string, any>,
  tenantId: string,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    await supabase
      .from("workflow_audit_log")
      .insert({
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        details,
        performed_by: userId,
      })
  } catch (err: any) {
    console.error("Error logging workflow action:", err.message)
  }
}

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

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId and status are required' },
        { status: 400 }
      )
    }

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      )
    }

    // Get the current bon approvisionnement
    const { data: order, error: getError } = await supabase
      .from('bon_approvisionnement')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single()

    if (getError) {
      throw new Error(getError.message)
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      status: status,
      updated_at: new Date().toISOString()
    }

    // If validating, set validated_by and validated_at
    if (status === 'validated') {
      updateData.validated_by = user.id
      updateData.validated_at = new Date().toISOString()
    }

    // Update bon approvisionnement
    const { data: updated, error: updateError } = await supabase
      .from('bon_approvisionnement')
      .update(updateData)
      .eq('id', orderId)
      .select()

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Log the action in workflow audit log
    await logWorkflowAction(
      'bon_approvisionnement',
      orderId,
      status.toLowerCase(),
      order.status,
      status,
      { changed_fields: Object.keys(updateData) },
      tenantId,
      user.id,
      supabase
    )

    return NextResponse.json(updated?.[0], { status: 200 })
  } catch (error) {
    console.error('[Update Bon Approvisionnement API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
