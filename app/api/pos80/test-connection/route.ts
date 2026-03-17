import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'
import { testPOS80Connection } from '@/lib/pos80/actions'

/**
 * POST /api/pos80/test-connection
 * Test POS80 API connection
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await testPOS80Connection(profile.tenantId)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      responseTime: result.responseTime,
    })
  } catch (error) {
    console.error('[v0] Test connection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
