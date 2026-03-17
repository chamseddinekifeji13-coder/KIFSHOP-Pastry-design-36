import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'
import { syncPOS80Transactions } from '@/lib/pos80/sync'

/**
 * POST /api/pos80/sync
 * Manual trigger for POS80 synchronization
 */
export async function POST(req: NextRequest) {
  try {
    // Get tenant from session
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { syncType = 'manual', since, limit } = body

    // Run sync
    const result = await syncPOS80Transactions(profile.tenantId, {
      syncType: syncType as 'manual' | 'cron' | 'webhook',
      since,
      limit,
    })

    return NextResponse.json({
      success: result.success,
      data: {
        transactionsFound: result.transactionsFound,
        transactionsCreated: result.transactionsCreated,
        transactionsUpdated: result.transactionsUpdated,
        stockUpdated: result.stockUpdated,
        revenueCreated: result.revenueCreated,
        duration: `${result.duration_ms}ms`,
        startedAt: result.startedAt,
        endedAt: result.endedAt,
      },
      error: result.errorMessage,
    })
  } catch (error) {
    console.error('[v0] Sync API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
