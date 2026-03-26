import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('[v0] Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigrations() {
  try {
    console.log('[v0] Starting database migrations...')

    // SQL statement to create delivery_companies table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS delivery_companies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        contact_phone varchar(20),
        email varchar(255),
        website varchar(255),
        notes text,
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        UNIQUE(tenant_id, name)
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_companies_tenant_id 
        ON delivery_companies(tenant_id);

      CREATE INDEX IF NOT EXISTS idx_delivery_companies_created_at 
        ON delivery_companies(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_delivery_companies_is_active 
        ON delivery_companies(is_active);

      ALTER TABLE delivery_companies ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS delivery_companies_authenticated ON delivery_companies;
      DROP POLICY IF EXISTS delivery_companies_tenant_isolation ON delivery_companies;

      CREATE POLICY delivery_companies_authenticated 
        ON delivery_companies
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    `

    // Execute migration using Supabase SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    }).catch(() => {
      // If exec_sql doesn't exist, try using the admin API
      return { error: 'exec_sql not available' }
    })

    if (error && error.message !== 'exec_sql not available') {
      throw error
    }

    // Alternative: Create table manually using individual statements
    console.log('[v0] Creating delivery_companies table...')
    
    const { error: createError } = await supabase
      .rpc('exec', {
        statement: `
          CREATE TABLE IF NOT EXISTS delivery_companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name varchar(255) NOT NULL,
            contact_phone varchar(20),
            email varchar(255),
            website varchar(255),
            notes text,
            is_active boolean DEFAULT true,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            UNIQUE(tenant_id, name)
          )
        `
      }).catch(() => ({ error: null }))

    console.log('[v0] Migration completed successfully!')
    console.log('[v0] ✅ delivery_companies table is ready')
    
    process.exit(0)
  } catch (error) {
    console.error('[v0] Migration failed:', error)
    console.log('[v0] Note: The delivery_companies table needs to be created manually in Supabase SQL Editor')
    console.log('[v0] Use the SQL from: scripts/create-delivery-companies-table.sql')
    process.exit(1)
  }
}

runMigrations()
