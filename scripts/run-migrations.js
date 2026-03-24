import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[v0] Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function executeScript(scriptName) {
  try {
    console.log(`[v0] Executing ${scriptName}...`)
    
    // Read the script file
    const fs = await import('fs')
    const path = await import('path')
    const scriptPath = path.join(process.cwd(), `scripts/${scriptName}`)
    const sql = fs.readFileSync(scriptPath, 'utf-8')
    
    // Execute the script
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error(`[v0] Error executing ${scriptName}:`, error)
      return false
    }
    
    console.log(`[v0] Successfully executed ${scriptName}`)
    return true
  } catch (error) {
    console.error(`[v0] Error processing ${scriptName}:`, error.message)
    return false
  }
}

async function runMigrations() {
  const scripts = [
    'audit-001-fix-tenants-schema.sql',
    'audit-002-fix-clients-security.sql',
    'audit-003-create-core-business-tables.sql',
    'audit-004-fix-best-delivery-rls.sql',
    'pos80-001-create-pos80-config-table.sql',
    'pos80-002-create-pos80-sync-logs-table.sql',
    'pos80-003-add-source-column-to-pos-sales.sql'
  ]
  
  for (const script of scripts) {
    const success = await executeScript(script)
    if (!success) {
      console.error(`[v0] Migration failed at ${script}`)
      process.exit(1)
    }
  }
  
  console.log('[v0] All migrations completed successfully!')
}

runMigrations()
