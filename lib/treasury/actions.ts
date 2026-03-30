import { createClient } from "@/lib/supabase/client"

export interface Transaction {
  id: string
  tenantId: string
  type: "entree" | "sortie"
  amount: number
  category: string
  paymentMethod: string
  reference: string | null
  description: string | null
  orderId: string | null
  createdBy: string | null
  createdAt: string
}

// Normalise le type de transaction pour compatibilite UI
// La DB stocke "income"/"expense", l'UI attend "entree"/"sortie"
function normalizeTransactionType(dbType: string): "entree" | "sortie" {
  if (dbType === "income" || dbType === "entree") return "entree"
  return "sortie"
}

export async function fetchTransactions(tenantId: string): Promise<Transaction[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) { 
    console.error("Error fetching transactions:", error.message)
    return [] 
  }
  
  return (data || []).map((t) => ({
    id: t.id, tenantId: t.tenant_id, type: normalizeTransactionType(t.type),
    amount: Number(t.amount), category: t.category, paymentMethod: t.payment_method,
    reference: t.reference, description: t.description, orderId: t.order_id,
    createdBy: t.created_by, createdAt: t.created_at,
  }))
}

// ─── Revenue Report Data ─────────────────────────────────────
// Uses the same Supabase browser client as fetchTransactions
// to avoid auth issues with API routes
export interface RevenueEntry {
  period: string
  label: string
  total_sales: number
  total_collections: number
  total_cash_income: number
  total_card_income: number
  total_expenses: number
  transactions_count: number
}

export async function fetchRevenueReport(
  tenantId: string,
  reportType: 'daily' | 'monthly' | 'annual' = 'daily'
): Promise<RevenueEntry[]> {
  const supabase = createClient()

  // Calculate date range
  let startDate: string
  if (reportType === 'daily') {
    const d = new Date(); d.setDate(d.getDate() - 30)
    startDate = d.toISOString().split('T')[0]
  } else if (reportType === 'monthly') {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1)
    startDate = d.toISOString().split('T')[0]
  } else {
    startDate = '2020-01-01'
  }

  // Fetch transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, type, category, payment_method, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching revenue data:', error.message)
    return []
  }

  // Aggregate by period
  const aggregateMap = new Map<string, RevenueEntry>()

  const getKey = (dateStr: string): string => {
    const date = new Date(dateStr)
    if (reportType === 'daily') {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    if (reportType === 'monthly') return date.toISOString().slice(0, 7)
    return date.getFullYear().toString()
  }

  const getLabel = (key: string): string => {
    if (reportType === 'daily') return key
    if (reportType === 'monthly') {
      return new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }
    return key
  }

  for (const t of transactions || []) {
    const key = getKey(t.created_at)
    if (!aggregateMap.has(key)) {
      aggregateMap.set(key, {
        period: key,
        label: getLabel(key),
        total_sales: 0, total_collections: 0,
        total_cash_income: 0, total_card_income: 0,
        total_expenses: 0, transactions_count: 0,
      })
    }
    const entry = aggregateMap.get(key)!
    entry.transactions_count++

    if (t.type === 'income' || t.type === 'entree') {
      entry.total_sales += Number(t.amount) || 0
      if (t.payment_method === 'cash') entry.total_cash_income += Number(t.amount) || 0
      else entry.total_card_income += Number(t.amount) || 0
    } else if (t.type === 'expense' || t.type === 'sortie') {
      entry.total_expenses += Number(t.amount) || 0
    }
  }

  // Sort by period ascending
  return Array.from(aggregateMap.values()).sort((a, b) => a.period.localeCompare(b.period))
}

// ─── Cashier Stats ────────────────────────────────────────────
// Uses the same Supabase browser client to avoid auth issues
export interface CashierStat {
  cashierId: string
  cashierName: string
  totalTransactions: number
  totalCollections: number
  totalAmount: number
}

export async function fetchCashierStats(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<CashierStat[]> {
  const supabase = createClient()

  const start = startDate
    ? `${startDate}T00:00:00`
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const end = endDate
    ? `${endDate}T23:59:59`
    : new Date().toISOString()

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('created_by, created_by_name, amount, type, category, payment_method')
    .eq('tenant_id', tenantId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) {
    console.error('Error fetching cashier stats:', error.message)
    return []
  }

  // Group by cashier
  const cashierMap = new Map<string, CashierStat>()

  for (const t of transactions || []) {
    const cashierId = t.created_by || 'unknown'
    if (!cashierMap.has(cashierId)) {
      cashierMap.set(cashierId, {
        cashierId,
        cashierName: t.created_by_name || 'Inconnu',
        totalTransactions: 0,
        totalCollections: 0,
        totalAmount: 0,
      })
    }
    const cashier = cashierMap.get(cashierId)!
    cashier.totalTransactions++

    // Count income
    if (t.type === 'income' || t.type === 'entree') {
      cashier.totalCollections++
      cashier.totalAmount += Number(t.amount) || 0
    }
  }

  return Array.from(cashierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
}

// ─── Daily Closure (Clôture Journée) ─────────────────────────
// Uses browser Supabase client to avoid auth issues with server routes
export interface DailyClosureSummary {
  date: string
  totalSales: number
  totalExpenses: number
  totalCashIncome: number
  totalCardIncome: number
  totalOtherIncome: number
  transactionsCount: number
  ordersCount: number
  netRevenue: number
}

export async function fetchDailySummary(
  tenantId: string,
  date?: string
): Promise<DailyClosureSummary> {
  const supabase = createClient()
  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, type, payment_method, category')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`)

  if (error) {
    console.error('Error fetching daily summary:', error.message)
    return {
      date: targetDate, totalSales: 0, totalExpenses: 0,
      totalCashIncome: 0, totalCardIncome: 0, totalOtherIncome: 0,
      transactionsCount: 0, ordersCount: 0, netRevenue: 0,
    }
  }

  let totalSales = 0
  let totalExpenses = 0
  let totalCashIncome = 0
  let totalCardIncome = 0
  let totalOtherIncome = 0

  for (const t of transactions || []) {
    const amount = Number(t.amount) || 0
    if (t.type === 'income' || t.type === 'entree') {
      totalSales += amount
      if (t.payment_method === 'cash' || t.payment_method === 'especes') totalCashIncome += amount
      else if (t.payment_method === 'card' || t.payment_method === 'carte') totalCardIncome += amount
      else totalOtherIncome += amount
    } else if (t.type === 'expense' || t.type === 'sortie') {
      totalExpenses += amount
    }
  }

  // Count orders for the day
  const { count: ordersCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`)

  return {
    date: targetDate,
    totalSales,
    totalExpenses,
    totalCashIncome,
    totalCardIncome,
    totalOtherIncome,
    transactionsCount: transactions?.length || 0,
    ordersCount: ordersCount || 0,
    netRevenue: totalSales - totalExpenses,
  }
}

export async function saveDailyClosure(
  tenantId: string,
  summary: DailyClosureSummary,
  actualClosing: number,
  closedByName: string,
  differenceReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Check if closure already exists for this date
  const { data: existing } = await supabase
    .from('cash_closures')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('closure_date', summary.date)
    .maybeSingle()

  if (existing) {
    // Update existing closure
    const { error } = await supabase
      .from('cash_closures')
      .update({
        closed_by_name: closedByName,
        total_sales: summary.totalSales,
        total_collections: summary.totalSales,
        total_cash_income: summary.totalCashIncome,
        total_card_income: summary.totalCardIncome,
        total_other_income: summary.totalOtherIncome,
        total_expenses: summary.totalExpenses,
        orders_count: summary.ordersCount,
        transactions_count: summary.transactionsCount,
        expected_closing: summary.netRevenue,
        actual_closing: actualClosing,
        difference: actualClosing - summary.netRevenue,
        difference_reason: differenceReason || null,
      })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // Insert new closure
  const { error } = await supabase
    .from('cash_closures')
    .insert({
      tenant_id: tenantId,
      closure_date: summary.date,
      closed_by_name: closedByName,
      total_sales: summary.totalSales,
      total_collections: summary.totalSales,
      total_cash_income: summary.totalCashIncome,
      total_card_income: summary.totalCardIncome,
      total_other_income: summary.totalOtherIncome,
      total_expenses: summary.totalExpenses,
      orders_count: summary.ordersCount,
      transactions_count: summary.transactionsCount,
      opening_balance: 0,
      expected_closing: summary.netRevenue,
      actual_closing: actualClosing,
      difference: actualClosing - summary.netRevenue,
      difference_reason: differenceReason || null,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export interface ClosureHistoryEntry {
  id: string
  closure_date: string
  closed_by_name: string
  total_sales: number
  total_expenses: number
  total_cash_income: number
  total_card_income: number
  transactions_count: number
  orders_count: number
  expected_closing: number
  actual_closing: number
  difference: number
  difference_reason: string | null
  created_at: string
}

export async function fetchClosureHistory(
  tenantId: string,
  limit: number = 30
): Promise<ClosureHistoryEntry[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('cash_closures')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('closure_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching closure history:', error.message)
    return []
  }

  return (data || []) as ClosureHistoryEntry[]
}

export async function createTransaction(tenantId: string, data: {
  type: "income" | "expense"; amount: number; category: string;
  paymentMethod?: string; reference?: string; description?: string; orderId?: string
}): Promise<Transaction | null> {
  const supabase = createClient()
  
  try {
    // Normalize type to match database constraints
    const normalizedType = data.type === "income" || data.type === "entree" ? "income" : "expense"
    
    // Do NOT use created_by column - it has a FK constraint that causes errors
    // Use created_by_name and created_by_id instead (TEXT columns, no FK)
    const { data: row, error } = await supabase.from("transactions").insert({
      tenant_id: tenantId,
      type: normalizedType,
      amount: data.amount,
      category: data.category,
      payment_method: data.paymentMethod || "cash",
      reference: data.reference || null,
      description: data.description || null,
      order_id: data.orderId || null,
      // Removed: created_by - causes FK constraint violation
    }).select().single()
    
    if (error) {
      console.error("[v0] Error creating transaction:", error.message, error.details)
      throw error
    }
    
    if (!row) {
      console.error("[v0] No data returned from transaction insert")
      return null
    }
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: normalizeTransactionType(row.type),
      amount: Number(row.amount),
      category: row.category,
      paymentMethod: row.payment_method,
      reference: row.reference,
      description: row.description,
      orderId: row.order_id,
      createdBy: row.created_by_name || row.created_by,
      createdAt: row.created_at
    }
  } catch (err: Error) {
    console.error("[v0] Exception in createTransaction:", err.message)
    throw err
  }
}
