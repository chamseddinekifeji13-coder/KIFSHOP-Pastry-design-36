import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('pos80_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('[POS80 Config GET]', error)
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, apiUrl, apiKey, merchantId, terminalId, isActive } = await req.json()

    if (!tenantId || !apiUrl || !apiKey || !merchantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('pos80_config')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    let result
    if (existing) {
      result = await supabase
        .from('pos80_config')
        .update({
          api_url: apiUrl,
          api_key: apiKey,
          merchant_id: merchantId,
          terminal_id: terminalId,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select()
        .single()
    } else {
      result = await supabase
        .from('pos80_config')
        .insert({
          tenant_id: tenantId,
          api_url: apiUrl,
          api_key: apiKey,
          merchant_id: merchantId,
          terminal_id: terminalId,
          is_active: isActive,
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[POS80 Config POST]', error)
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('pos80_config')
      .delete()
      .eq('tenant_id', tenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POS80 Config DELETE]', error)
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    )
  }
}
