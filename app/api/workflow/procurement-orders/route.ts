import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

    // Get tenant_id from user metadata or header
    const tenantId = user.user_metadata?.tenant_id || 
      request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      )
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    // Use admin client to bypass RLS for fetching
    const adminSupabase = createAdminClient()

    // Query bon_approvisionnement table (not procurement_orders)
    let query = adminSupabase
      .from('bon_approvisionnement')
      .select(`
        *,
        items:bon_approvisionnement_items(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('[Procurement Orders] Query error:', error.message)
      throw new Error(error.message)
    }

    return NextResponse.json(orders || [], { status: 200 })
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

    const body = await request.json()
    const tenantId = user.user_metadata?.tenant_id || request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Generate reference number
    const { data: refData, error: rpcError } = await adminSupabase.rpc('generate_appro_reference', {
      p_tenant_id: tenantId
    })

    let referenceNumber = refData
    if (rpcError) {
      console.warn('[Generate Reference] RPC error:', rpcError.message)
      referenceNumber = `BA-${Date.now()}`
    }

    const order = {
      tenant_id: tenantId,
      reference: referenceNumber,
      status: 'draft',
      priority: body.priority || 'normal',
      notes: body.notes || null,
      total_items: 0,
      estimated_total: 0,
      created_by: user.id
    }

    const { data, error } = await adminSupabase
      .from('bon_approvisionnement')
      .insert([order])
      .select()

    if (error) {
      console.error('[Create Bon Approvisionnement] Error:', error.message)
      throw new Error(error.message)
    }

    return NextResponse.json(data?.[0], { status: 201 })
  } catch (error) {
    console.error('[Create Procurement Order API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
