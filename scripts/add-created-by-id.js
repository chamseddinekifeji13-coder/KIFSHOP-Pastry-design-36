import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addCreatedByIdColumn() {
  try {
    console.log('[v0] Starting migration: Adding created_by_id column...');

    // Execute the SQL command using Supabase admin API
    const { data, error } = await supabase.rpc('exec', {
      sql: `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by_id TEXT;`
    });

    if (error) {
      // If the RPC function doesn't exist, try direct query
      console.log('[v0] RPC exec not available, attempting direct approach...');
      
      const { error: directError } = await supabase
        .from('transactions')
        .select('id')
        .limit(1);
      
      if (directError) {
        console.error('[v0] Error accessing transactions table:', directError);
        process.exit(1);
      }
      
      console.log('[v0] Transactions table is accessible');
      console.log('[v0] Migration script should be run manually in Supabase dashboard');
      process.exit(0);
    }

    console.log('[v0] Migration successful');
    console.log('[v0] Response:', data);
    process.exit(0);
  } catch (error) {
    console.error('[v0] Migration failed:', error);
    process.exit(1);
  }
}

addCreatedByIdColumn();
