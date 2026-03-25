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

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let query = supabase
      .from('procurement_orders')
      .select('*')
      .eq('tenant_id', user.user_metadata?.tenant_id)
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

    const body = await request.json()

    const order = {
      tenant_id: user.user_metadata?.tenant_id,
      material_id: body.material_id,
      material_name: body.material_name,
      quantity: body.quantity,
      unit: body.unit,
      supplier_id: body.supplier_id || null,
      status: 'DRAFT',
      created_by: user.id,
      audit_trail: JSON.stringify([{
        action: 'created',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        changes: { status: 'DRAFT' }
      }])
    }

    const { data, error } = await supabase
      .from('procurement_orders')
      .insert([order])
      .select()

    if (error) {
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
