import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get the current order
    const { data: order, error: getError } = await supabase
      .from('procurement_orders')
      .select('audit_trail')
      .eq('id', orderId)
      .eq('tenant_id', user.user_metadata?.tenant_id)
      .single()

    if (getError) {
      throw new Error(getError.message)
    }

    // Parse existing audit trail
    const auditTrail = order?.audit_trail ? JSON.parse(order.audit_trail) : []

    // Add new entry
    auditTrail.push({
      action: status.toLowerCase(),
      timestamp: new Date().toISOString(),
      user_id: user.id,
      changes: { status: status }
    })

    // Update order
    const { data: updated, error: updateError } = await supabase
      .from('procurement_orders')
      .update({
        status: status,
        audit_trail: JSON.stringify(auditTrail),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()

    if (updateError) {
      throw new Error(updateError.message)
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
