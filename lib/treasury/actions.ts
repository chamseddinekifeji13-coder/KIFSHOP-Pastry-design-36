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
