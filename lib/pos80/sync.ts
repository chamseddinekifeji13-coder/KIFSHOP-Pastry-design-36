'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { POS80Transaction } from './client'
import { createPOS80ClientFromConfig, logPOS80Sync } from './actions'

export interface SyncResult {
  success: boolean
  startedAt: Date
  endedAt: Date
  transactionsFound: number
  transactionsCreated: number
  transactionsUpdated: number
  stockUpdated: number
  revenueCreated: number
  errorMessage?: string
  duration_ms: number
}

/**
 * Sync transactions from POS80 and integrate them into the system
 */
export async function syncPOS80Transactions(
  tenantId: string,
  options?: {
    syncType?: 'manual' | 'cron' | 'webhook'
    since?: string
    limit?: number
  }
): Promise<SyncResult> {
  const startedAt = new Date()
  let result: SyncResult = {
    success: false,
    startedAt,
    endedAt: new Date(),
    transactionsFound: 0,
    transactionsCreated: 0,
    transactionsUpdated: 0,
    stockUpdated: 0,
    revenueCreated: 0,
    duration_ms: 0,
  }

  try {
    // Log sync start
    await logPOS80Sync(tenantId, {
      sync_type: options?.syncType || 'manual',
      status: 'running',
      started_at: startedAt.toISOString(),
    })

    // Get POS80 client
    const client = await createPOS80ClientFromConfig(tenantId)
    if (!client) {
      throw new Error('POS80 client not configured')
    }

    // Fetch transactions
    const transactions = await client.fetchTransactions(
      options?.limit || 100,
      options?.since
    )
    result.transactionsFound = transactions.length

    if (transactions.length === 0) {
      console.log('[v0] No new POS80 transactions found')
      result.success = true
      return completeSync(tenantId, result, 'success')
    }

    // Process each transaction
    const supabase = createAdminClient()

    for (const transaction of transactions) {
      try {
        // Check if transaction already exists
        const { data: existing } = await supabase
          .from('pos_sales')
          .select('id')
          .eq('pos80_transaction_id', transaction.id)
          .single()

        if (existing) {
          // Update existing transaction
          result.transactionsUpdated++
        } else {
          // Create new transaction
          const { error: insertError } = await supabase
            .from('pos_sales')
            .insert({
              tenant_id: tenantId,
              amount: transaction.amount,
              payment_method: transaction.paymentMethod,
              description: `POS80 - ${transaction.receiptNumber || transaction.id}`,
              source: 'pos80',
              pos80_transaction_id: transaction.id,
              created_at: transaction.timestamp,
            })

          if (insertError) {
            console.error('[v0] Error inserting POS80 transaction:', insertError.message)
          } else {
            result.transactionsCreated++
          }
        }

        // Handle inventory updates if items are included
        if (transaction.items && transaction.items.length > 0) {
          result.stockUpdated += await updateInventoryFromPOS80(
            supabase,
            tenantId,
            transaction
          )
        }

        // Track revenue
        if (transaction.status === 'success') {
          result.revenueCreated += transaction.amount
        }
      } catch (error) {
        console.error('[v0] Error processing transaction:', error)
      }
    }

    result.success = true
    result.endedAt = new Date()
    result.duration_ms = result.endedAt.getTime() - startedAt.getTime()

    return completeSync(tenantId, result, 'success', client.getLastResponseTime())
  } catch (error) {
    console.error('[v0] Error in syncPOS80Transactions:', error)
    result.errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.endedAt = new Date()
    result.duration_ms = result.endedAt.getTime() - startedAt.getTime()

    await logPOS80Sync(tenantId, {
      sync_type: options?.syncType || 'manual',
      status: 'failed',
      started_at: startedAt.toISOString(),
      ended_at: result.endedAt.toISOString(),
      duration_ms: result.duration_ms,
      error_message: result.errorMessage,
    })

    return result
  }
}

/**
 * Update inventory from POS80 items
 */
async function updateInventoryFromPOS80(
  supabase: any,
  tenantId: string,
  transaction: POS80Transaction
): Promise<number> {
  let updated = 0

  if (!transaction.items) return 0

  for (const item of transaction.items) {
    try {
      // Find product by SKU
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('sku', item.sku)
        .eq('tenant_id', tenantId)
        .single()

      if (product) {
        // Update stock
        const { error } = await supabase
          .from('stock_by_location')
          .update({
            quantity: Math.max(0, item.quantity - item.quantity), // Deduct quantity
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', product.id)

        if (!error) {
          updated++
        }
      }
    } catch (error) {
      console.error('[v0] Error updating inventory for item:', item.sku, error)
    }
  }

  return updated
}

/**
 * Complete sync and log results
 */
async function completeSync(
  tenantId: string,
  result: SyncResult,
  status: 'success' | 'failed' | 'partial',
  responseTime?: number
): Promise<SyncResult> {
  await logPOS80Sync(tenantId, {
    sync_type: 'cron',
    status,
    started_at: result.startedAt.toISOString(),
    ended_at: result.endedAt.toISOString(),
    duration_ms: result.duration_ms,
    transactions_count: result.transactionsFound,
    transactions_created: result.transactionsCreated,
    transactions_updated: result.transactionsUpdated,
    stock_updated: result.stockUpdated,
    revenue_created: result.revenueCreated,
    error_message: result.errorMessage || null,
    pos80_response_time_ms: responseTime || 0,
  })

  return result
}

/**
 * Fetch daily sales report from POS80
 */
export async function syncPOS80DailySalesReport(
  tenantId: string,
  date: string
): Promise<{
  totalRevenue: number
  transactionCount: number
  success: boolean
}> {
  try {
    const client = await createPOS80ClientFromConfig(tenantId)
    if (!client) {
      throw new Error('POS80 client not configured')
    }

    const report = await client.fetchDailySalesReport(date)

    if (!report) {
      return {
        totalRevenue: 0,
        transactionCount: 0,
        success: false,
      }
    }

    // Log this report fetch
    await logPOS80Sync(tenantId, {
      sync_type: 'manual',
      status: 'success',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: 0,
      transactions_count: report.transactionCount,
      revenue_created: report.totalRevenue,
    })

    return {
      totalRevenue: report.totalRevenue,
      transactionCount: report.transactionCount,
      success: true,
    }
  } catch (error) {
    console.error('[v0] Error fetching daily sales report:', error)
    return {
      totalRevenue: 0,
      transactionCount: 0,
      success: false,
    }
  }
}
