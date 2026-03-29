import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSession, serverErrorResponse } from '@/lib/api-helpers'

// Treasury Revenue API - Aggregates data from transactions, orders, and collections
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

    // Calculate date range - use full ISO format for proper comparison
    let startDate: string
    
    if (type === 'daily') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)
      startDate = thirtyDaysAgo.toISOString()
    } else if (type === 'monthly') {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      oneYearAgo.setHours(0, 0, 0, 0)
      startDate = oneYearAgo.toISOString()
    } else {
      startDate = '2020-01-01T00:00:00.000Z' // All years
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, payment_method, created_at')
      .eq('tenant_id', session.tenantId)
      .gte('created_at', startDate)
    

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
      if (type === 'daily') return date.toISOString().split('T')[0]
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
    // DB stores "income"/"expense" for type
    for (const t of transactions || []) {
      const key = getKey(t.created_at)
      const entry = ensureEntry(key)
      entry.transactions_count++
      
      // Income types: "income", "entree" 
      // Expense types: "expense", "sortie"
      const isIncome = t.type === 'income' || t.type === 'entree'
      
      if (isIncome) {
        entry.total_sales += Number(t.amount) || 0
        entry.total_collections += Number(t.amount) || 0
        if (t.payment_method === 'cash' || t.payment_method === 'especes') {
          entry.total_cash_income += Number(t.amount) || 0
        } else {
          entry.total_card_income += Number(t.amount) || 0
        }
      } else {
        entry.total_expenses += Number(t.amount) || 0
      }
    }

    // Process collections
    for (const c of collections || []) {
      const key = getKey(c.collected_at)
      const entry = ensureEntry(key)
      entry.total_collections += Number(c.amount) || 0
      if (c.payment_method === 'cash') entry.total_cash_income += Number(c.amount) || 0
      else entry.total_card_income += Number(c.amount) || 0
    }

    // Process orders
    for (const o of orders || []) {
      const key = getKey(o.created_at)
      const entry = ensureEntry(key)
      entry.total_sales += Number(o.total) || 0
      if (o.payment_method === 'cash') entry.total_cash_income += Number(o.total) || 0
      else entry.total_card_income += Number(o.total) || 0
    }

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
