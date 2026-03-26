import { NextResponse } from 'next/server'

/**
 * Fix transactions table schema issues
 * This endpoint removes the problematic foreign key constraint on created_by
 * and ensures the table is properly configured for the POS system
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    // Use the Supabase REST API directly to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        sql: `
          -- Drop the problematic foreign key constraint on created_by
          ALTER TABLE IF EXISTS public.transactions 
          DROP CONSTRAINT IF EXISTS transactions_created_by_fkey CASCADE;
          
          -- Modify the created_by column to be nullable
          ALTER TABLE IF EXISTS public.transactions 
          ALTER COLUMN created_by DROP NOT NULL;
          
          -- Create indexes for performance (if they don't exist)
          CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id 
            ON public.transactions(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
            ON public.transactions(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_transactions_type 
            ON public.transactions(type);
        `
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[v0] SQL fix error:', data)
      return NextResponse.json(
        { error: `Failed to fix transactions table: ${data.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transactions table has been fixed successfully',
      details: data
    })
  } catch (err: any) {
    console.error('[v0] Fix transactions error:', err)
    return NextResponse.json(
      { error: `Server error: ${err.message}` },
      { status: 500 }
    )
  }
}
