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

    // Get the latest sync
    const { data: lastSync, error } = await supabase
      .from('pos80_sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const status = {
      lastSync: lastSync || null,
      nextSync: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      isRunning: lastSync?.status === 'running',
      error: lastSync?.status === 'failed' ? lastSync.error_message : null,
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('[POS80 Status GET]', error)
    return NextResponse.json(
      { error: 'Failed to fetch status', isRunning: false },
      { status: 500 }
    )
  }
}
