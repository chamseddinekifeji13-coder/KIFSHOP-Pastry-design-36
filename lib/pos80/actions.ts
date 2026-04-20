'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { POS80Config } from './client'
import { POS80ApiClient } from './client'

export interface POS80ConfigDB {
  id: number
  tenant_id: string
  api_url: string
  api_key: string
  merchant_id: string
  terminal_id: string | null
  auth_type: 'bearer' | 'basic' | 'api_key'
  is_active: boolean
  last_tested_at: string | null
  test_status: string | null
  test_error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Get POS80 configuration for a tenant
 */
export async function getPOS80Config(tenantId: string): Promise<POS80ConfigDB | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pos80_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('[v0] Error fetching POS80 config:', error.message)
    return null
  }

  return data as POS80ConfigDB
}

/**
 * Save or update POS80 configuration
 */
export async function savePOS80Config(
  tenantId: string,
  config: Omit<POS80ConfigDB, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'>
): Promise<POS80ConfigDB | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Session expiree - veuillez vous reconnecter')

  // Check if config exists
  const existing = await getPOS80Config(tenantId)

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('pos80_config')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('[v0] Error updating POS80 config:', error.message)
      return null
    }

    return data as POS80ConfigDB
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('pos80_config')
      .insert({
        tenant_id: tenantId,
        ...config,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Error creating POS80 config:', error.message)
      return null
    }

    return data as POS80ConfigDB
  }
}

/**
 * Test POS80 connection
 */
export async function testPOS80Connection(tenantId: string): Promise<{
  success: boolean
  message: string
  responseTime?: number
}> {
  const config = await getPOS80Config(tenantId)

  if (!config) {
    return { success: false, message: 'Configuration POS80 non trouvée' }
  }

  if (!config.is_active) {
    return { success: false, message: 'Configuration POS80 desactivée' }
  }

  const clientConfig: POS80Config = {
    apiUrl: config.api_url,
    apiKey: config.api_key,
    merchantId: config.merchant_id,
    terminalId: config.terminal_id || undefined,
    authType: config.auth_type,
  }

  const client = new POS80ApiClient(clientConfig)
  const result = await client.testConnection()

  // Update test status in database
  const supabase = createAdminClient()
  await supabase
    .from('pos80_config')
    .update({
      last_tested_at: new Date().toISOString(),
      test_status: result.success ? 'success' : 'failed',
      test_error_message: result.message,
    })
    .eq('tenant_id', tenantId)

  return result
}

/**
 * Create POS80 client from stored config
 */
export async function createPOS80ClientFromConfig(tenantId: string): Promise<POS80ApiClient | null> {
  const config = await getPOS80Config(tenantId)

  if (!config) {
    console.error('[v0] POS80 config not found for tenant:', tenantId)
    return null
  }

  if (!config.is_active) {
    console.error('[v0] POS80 config is disabled for tenant:', tenantId)
    return null
  }

  const clientConfig: POS80Config = {
    apiUrl: config.api_url,
    apiKey: config.api_key,
    merchantId: config.merchant_id,
    terminalId: config.terminal_id || undefined,
    authType: config.auth_type,
  }

  return new POS80ApiClient(clientConfig)
}

/**
 * Log sync operation to database
 */
export async function logPOS80Sync(tenantId: string, logData: any): Promise<void> {
  const supabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('pos80_sync_logs').insert({
    tenant_id: tenantId,
    triggered_by: user?.id || null,
    ...logData,
    created_at: new Date().toISOString(),
  })
}

/**
 * Get recent sync logs
 */
export async function getPOS80SyncLogs(
  tenantId: string,
  limit: number = 50,
  daysBack: number = 30
): Promise<any[]> {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const { data, error } = await supabase
    .from('pos80_sync_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching POS80 sync logs:', error.message)
    return []
  }

  return data || []
}
