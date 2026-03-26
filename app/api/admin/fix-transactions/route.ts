import { NextResponse } from 'next/server'

/**
 * Fix transactions table schema issues
 * This endpoint provides instructions and status for fixing the problematic foreign key constraint
 */
export async function GET() {
  return NextResponse.json({
    status: 'constraint_detected',
    message: 'The transactions table has a problematic foreign key constraint on created_by',
    solution: 'Execute the following SQL in your Supabase dashboard (SQL Editor):',
    sql_commands: [
      'ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;',
      'ALTER TABLE IF EXISTS public.transactions ALTER COLUMN created_by DROP NOT NULL;'
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
  return NextResponse.json({
    success: false,
    message: 'Manual SQL execution required. Please follow the GET endpoint instructions to fix this issue.',
    nextSteps: 'Execute the SQL commands provided via GET /api/admin/fix-transactions in your Supabase dashboard'
  }, { status: 400 })
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
