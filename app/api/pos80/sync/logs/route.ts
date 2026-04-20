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

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('pos80_sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[v0] Logs GET error:', error)
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[v0] Logs GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
