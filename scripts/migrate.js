import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: {
    schema: 'public',
  },
});

// Execute raw SQL via Supabase
async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec', { sql });
  if (error) throw error;
  return data;
}

// Migration scripts
const migrations = [
  {
    name: '001-fix-tenants-schema',
    sql: `
      ALTER TABLE public.tenants
        ADD COLUMN IF NOT EXISTS slug text,
        ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON public.tenants(subscription_plan);
    `,
  },
  {
    name: '002-fix-clients-type',
    sql: `
      -- Fix tenant_id type in clients table if needed
      ALTER TABLE public.clients
        ADD COLUMN IF NOT EXISTS tenant_id_new text;

      UPDATE public.clients 
        SET tenant_id_new = tenant_id::text 
        WHERE tenant_id_new IS NULL;

      -- If successful, drop old column and rename new one (requires manual review)
    `,
  },
];

async function runMigrations() {
  console.log('[v0] Starting migrations...');

  for (const migration of migrations) {
    try {
      console.log(`[v0] Running migration: ${migration.name}`);
      await executeSql(migration.sql);
      console.log(`[v0] ✓ Migration ${migration.name} completed`);
    } catch (error) {
      console.error(`[v0] ✗ Migration ${migration.name} failed:`, error.message);
      throw error;
    }
  }

  console.log('[v0] All migrations completed successfully!');
}

runMigrations().catch((error) => {
  console.error('[v0] Migration failed:', error);
  process.exit(1);
});
