import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncPOS80Transactions } from '@/lib/pos80/sync'
import { logPOS80Sync } from '@/lib/pos80/actions'

/**
 * GET /api/cron/sync-pos80
 * Automatic synchronization cron job - runs every 5 minutes via Vercel Crons
 * This is called by Vercel infrastructure, not by users
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const cronSecret = req.headers.get('authorization')
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[v0] Unauthorized cron call')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[v0] POS80 Cron Job Started at', new Date().toISOString())

    const supabase = await createAdminClient()

    // Get all active tenants with POS80 config
    const { data: tenants, error: tenantsError } = await supabase
      .from('pos80_config')
      .select('tenant_id')
      .eq('is_active', true)

    if (tenantsError) {
      console.error('[v0] Error fetching tenants:', tenantsError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch tenants',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    if (!tenants || tenants.length === 0) {
      console.log('[v0] No active POS80 configurations found')
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No active tenants to sync',
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`[v0] Found ${tenants.length} active tenants for sync`)

    const results = []

    // Sync each tenant
    for (const tenant of tenants) {
      try {
        const result = await syncPOS80Transactions(tenant.tenant_id, {
          syncType: 'cron',
          limit: 100,
        })

        results.push({
          tenant_id: tenant.tenant_id,
          success: result.success,
          transactionsCreated: result.transactionsCreated,
          transactionsFound: result.transactionsFound,
          duration: result.duration_ms,
        })

        console.log(
          `[v0] Synced ${result.transactionsCreated} transactions for tenant ${tenant.tenant_id}`
        )
      } catch (error) {
        console.error(`[v0] Error syncing tenant ${tenant.tenant_id}:`, error)
        results.push({
          tenant_id: tenant.tenant_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.length - successCount

    console.log(
      `[v0] POS80 Cron Job Completed: ${successCount} successful, ${failedCount} failed`
    )

    return NextResponse.json({
      success: true,
      synced: successCount,
      failed: failedCount,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Cron job error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cron job failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
