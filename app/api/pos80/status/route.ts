import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/active-profile'
import { getPOS80SyncLogs, getPOS80Config } from '@/lib/pos80/actions'

/**
 * GET /api/pos80/status
 * Get POS80 configuration and sync status
 */
export async function GET(req: NextRequest) {
  try {
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const config = await getPOS80Config(profile.tenantId)
    const syncLogs = await getPOS80SyncLogs(profile.tenantId, 10, 7) // Last 7 days

    // Get latest sync status
    const latestSync = syncLogs[0] || null

    return NextResponse.json({
      configured: !!config && config.is_active,
      config: config ? {
        merchantId: config.merchant_id,
        terminalId: config.terminal_id,
        isActive: config.is_active,
        lastTestedAt: config.last_tested_at,
        testStatus: config.test_status,
      } : null,
      latestSync,
      recentSyncs: syncLogs.slice(0, 5),
    })
  } catch (error) {
    console.error('[v0] Status API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    )
  }
}
