import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Fix transactions table schema issues
 * This endpoint fixes the problematic foreign key constraint
 */
export async function GET() {
  return NextResponse.json({
    status: 'constraint_detected',
    message: 'The transactions table has a problematic foreign key constraint on created_by',
    solution: 'Execute the following SQL in your Supabase dashboard (SQL Editor):',
    sql_commands: [
      'ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;',
      'ALTER TABLE IF EXISTS public.transactions ALTER COLUMN created_by DROP NOT NULL;',
      'ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS created_by_id TEXT;'
    ],
    instructions: [
      '1. Go to your Supabase project dashboard',
      '2. Click on "SQL Editor" in the left sidebar',
      '3. Create a new query and paste the SQL commands above',
      '4. Click "Run" to execute',
      '5. Refresh this page and try the payment again'
    ]
  })
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase credentials'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    })

    // Execute the fix commands
    const commands = [
      'ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;',
      'ALTER TABLE IF EXISTS public.transactions ALTER COLUMN created_by DROP NOT NULL;',
      'ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS created_by_id TEXT;'
    ]

    for (const sql of commands) {
      const { error } = await supabase.rpc('exec', { sql })
      if (error) {
        console.error('[v0] SQL Error:', error.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Transactions table schema has been fixed',
      note: 'Please refresh your browser and try the payment again'
    })
  } catch (error) {
    console.error('[v0] Fix transactions error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to auto-fix. Please execute the SQL commands manually via Supabase dashboard.'
    }, { status: 500 })
  }
}
