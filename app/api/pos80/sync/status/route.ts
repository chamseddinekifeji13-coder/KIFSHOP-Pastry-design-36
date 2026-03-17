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
    
    // Get the latest sync
    const { data: lastSync, error } = await supabase
      .from('pos80_sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[v0] Status GET error:', error)
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
    console.error('[v0] Status GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status', isRunning: false },
      { status: 500 }
    )
  }
}
