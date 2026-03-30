import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSession, serverErrorResponse } from '@/lib/api-helpers'

export async function GET(request: Request) {
  // Get session with proper error handling
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily'

    const supabase = await createClient()
    
    // Get data from multiple sources for real-time stats
    // 1. Transactions (income/expense)
    // 2. Order collections
    // 3. Orders with status completed/delivered
    
    let data: any[] = []

    // Calculate date range
    const now = new Date()
    let startDate: string
    
    if (type === 'daily') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      startDate = thirtyDaysAgo.toISOString().split('T')[0]
    } else if (type === 'monthly') {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      startDate = oneYearAgo.toISOString().split('T')[0]
    } else {
      startDate = '2020-01-01' // All years
    }

    // Fetch transactions for this tenant - include all sources of income
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, category, payment_method, created_at')
      .eq('tenant_id', session.tenantId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })

    // Fetch order collections  
    const { data: collections } = await supabase
      .from('order_collections')
      .select('amount, payment_method, collected_at')
      .eq('tenant_id', session.tenantId)
      .gte('collected_at', startDate)

    // Fetch completed orders
    const { data: orders } = await supabase
      .from('orders')
      .select('total, status, created_at, payment_method')
      .eq('tenant_id', session.tenantId)
      .in('status', ['completed', 'delivered', 'paid'])
      .gte('created_at', startDate)

    // Also get cash_closures for historical data
    const { data: closures } = await supabase
      .from('cash_closures')
      .select('*')
      .eq('tenant_id', session.tenantId)
      .gte('closure_date', startDate)

    // Aggregate data by period
    const aggregateMap = new Map<string, any>()

    const getKey = (dateStr: string): string => {
      const date = new Date(dateStr)
      if (type === 'daily') {
        // Return YYYY-MM-DD format for daily reports
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      if (type === 'monthly') return date.toISOString().slice(0, 7)
      return date.getFullYear().toString()
    }

    const getLabel = (key: string): string => {
      if (type === 'daily') return key
      if (type === 'monthly') {
        return new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      }
      return key
    }

    const ensureEntry = (key: string) => {
      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          [type === 'daily' ? 'closure_date' : type === 'monthly' ? 'month' : 'year']: type === 'daily' ? key : getLabel(key),
          total_sales: 0,
          total_collections: 0,
          total_cash_income: 0,
          total_card_income: 0,
          total_expenses: 0,
          transactions_count: 0,
        })
      }
      return aggregateMap.get(key)!
    }

    // Process transactions
    for (const t of transactions || []) {
      const key = getKey(t.created_at)
      const entry = ensureEntry(key)
      entry.transactions_count++
      
      if (t.type === 'income' || t.type === 'entree') {
        entry.total_sales += Number(t.amount) || 0
        if (t.payment_method === 'cash') entry.total_cash_income += Number(t.amount) || 0
        else entry.total_card_income += Number(t.amount) || 0
      } else if (t.type === 'expense' || t.type === 'sortie') {
        entry.total_expenses += Number(t.amount) || 0
      }
    }

    // Note: We don't process orders separately because POS sales already create transactions
    // This prevents double-counting. Order collections are also tracked in transactions table.
    
    // IMPORTANT: order_collections are ALREADY reflected in transactions via POS
    // DO NOT add them again to avoid double-counting
    // Collections counter is kept at 0 - all income is tracked via transactions.total_sales
    // Legacy collections (before POS system) would need manual migration to transactions table
    // for (const c of collections || []) {
    //   const key = getKey(c.collected_at)
    //   const entry = ensureEntry(key)
    //   entry.total_collections += Number(c.amount) || 0
    // }

    // Add cash closures historical data if no real-time data
    for (const closure of closures || []) {
      const key = getKey(closure.closure_date)
      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          [type === 'daily' ? 'closure_date' : type === 'monthly' ? 'month' : 'year']: type === 'daily' ? key : getLabel(key),
          total_sales: closure.total_sales || 0,
          total_collections: closure.total_collections || 0,
          total_cash_income: closure.total_cash_income || 0,
          total_card_income: closure.total_card_income || 0,
          total_expenses: closure.total_expenses || 0,
          transactions_count: closure.transactions_count || 0,
        })
      }
    }

    // Convert to sorted array
    data = Array.from(aggregateMap.values()).sort((a, b) => {
      const keyA = type === 'daily' ? a.closure_date : type === 'monthly' ? a.month : a.year
      const keyB = type === 'daily' ? b.closure_date : type === 'monthly' ? b.month : b.year
      return keyA.localeCompare(keyB)
    })

    return NextResponse.json({
      success: true,
      type,
      data,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
