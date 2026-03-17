import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/active-profile'

export async function GET(req: NextRequest) {
  try {
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = req.nextUrl.searchParams.get('tenantId') || profile.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('pos80_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[v0] Config GET error:', error)
      throw error
    }

    // Transform snake_case to camelCase for client
    if (data) {
      return NextResponse.json({
        id: data.id,
        tenant_id: data.tenant_id,
        api_url: data.api_url,
        api_key: data.api_key,
        merchant_id: data.merchant_id,
        terminal_id: data.terminal_id,
        is_active: data.is_active,
        last_tested_at: data.last_tested_at,
        test_status: data.test_status,
        test_error_message: data.test_error_message,
      })
    }

    return NextResponse.json(null)
  } catch (error) {
    console.error('[v0] Config GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { tenant_id, api_url, api_key, merchant_id, terminal_id, is_active } = body

    const tenantId = tenant_id || profile.tenantId

    if (!tenantId || !api_url || !api_key || !merchant_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('pos80_config')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    let result
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('pos80_config')
        .update({
          api_url,
          api_key,
          merchant_id,
          terminal_id: terminal_id || null,
          is_active: is_active ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (updateError) throw updateError
      result = updated
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('pos80_config')
        .insert({
          tenant_id: tenantId,
          api_url,
          api_key,
          merchant_id,
          terminal_id: terminal_id || null,
          is_active: is_active ?? false,
        })
        .select()
        .single()

      if (insertError) throw insertError
      result = inserted
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[v0] Config POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = req.nextUrl.searchParams.get('tenantId') || profile.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('pos80_config')
      .delete()
      .eq('tenant_id', tenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Config DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    )
  }
}
