import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'
import { syncPOS80Transactions } from '@/lib/pos80/sync'
import { POS80ApiClient } from '@/lib/pos80/client'

/**
 * POST /api/pos80/sync
 * Manual trigger for POS80 synchronization
 * Can also handle test connection
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, testConnection } = body

    // Get tenant from session or use provided tenantId
    const profile = await getActiveProfile()
    const actualTenantId = tenantId || profile?.tenantId

    if (!actualTenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle test connection
    if (testConnection) {
      const supabase = createAdminClient()
      const { data: config, error: configError } = await supabase
        .from('pos80_config')
        .select('*')
        .eq('tenant_id', actualTenantId)
        .single()

      if (configError || !config) {
        return NextResponse.json(
          { success: false, error: 'POS80 configuration not found' },
          { status: 400 }
        )
      }

      try {
        const client = new POS80ApiClient({
          apiUrl: config.api_url,
          apiKey: config.api_key,
          merchantId: config.merchant_id,
          terminalId: config.terminal_id || undefined,
          authType: config.auth_type,
        })
        const testResult = await client.testConnection()
        const isValid = testResult.success
        
        // Update last_tested_at
        if (isValid) {
          await supabase
            .from('pos80_config')
            .update({
              last_tested_at: new Date().toISOString(),
              test_status: 'success',
              test_error_message: null,
            })
            .eq('tenant_id', actualTenantId)

          return NextResponse.json({ success: true })
        } else {
          await supabase
            .from('pos80_config')
            .update({
              last_tested_at: new Date().toISOString(),
              test_status: 'failed',
              test_error_message: 'Invalid credentials or API URL',
            })
            .eq('tenant_id', actualTenantId)

          return NextResponse.json(
            { success: false, error: 'Connection test failed' },
            { status: 400 }
          )
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        const supabase = createAdminClient()
        await supabase
          .from('pos80_config')
          .update({
            last_tested_at: new Date().toISOString(),
            test_status: 'failed',
            test_error_message: errorMessage,
          })
          .eq('tenant_id', actualTenantId)

        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        )
      }
    }

    // Regular sync
    const { syncType = 'manual', since, limit } = body

    const result = await syncPOS80Transactions(actualTenantId, {
      syncType: syncType as 'manual' | 'cron' | 'webhook',
      since,
      limit,
    })

    return NextResponse.json({
      success: result.success,
      data: {
        transactions_count: result.transactionsFound,
        transactions_created: result.transactionsCreated,
        transactions_updated: result.transactionsUpdated,
        stock_updated: result.stockUpdated,
        revenue_created: result.revenueCreated,
        duration_ms: result.duration_ms,
        started_at: result.startedAt,
        ended_at: result.endedAt,
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
