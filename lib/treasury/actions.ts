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

  if (error) { console.error("Error fetching transactions:", error.message); return [] }
  return (data || []).map((t) => ({
    id: t.id, tenantId: t.tenant_id, type: normalizeTransactionType(t.type),
    amount: Number(t.amount), category: t.category, paymentMethod: t.payment_method,
    reference: t.reference, description: t.description, orderId: t.order_id,
    createdBy: t.created_by, createdAt: t.created_at,
  }))
}

export async function createTransaction(tenantId: string, data: {
  type: "income" | "expense"; amount: number; category: string;
  paymentMethod?: string; reference?: string; description?: string; orderId?: string
}): Promise<Transaction | null> {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Normalize type to match database constraints
    const normalizedType = data.type === "income" || data.type === "entree" ? "income" : "expense"
    
    const { data: row, error } = await supabase.from("transactions").insert({
      tenant_id: tenantId,
      type: normalizedType,
      amount: data.amount,
      category: data.category,
      payment_method: data.paymentMethod || "cash",
      reference: data.reference || null,
      description: data.description || null,
      order_id: data.orderId || null,
      created_by: user?.id || null, // Allow NULL for system transactions
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
      createdBy: row.created_by,
      createdAt: row.created_at
    }
  } catch (err: any) {
    console.error("[v0] Exception in createTransaction:", err.message)
    throw err
  }
}
