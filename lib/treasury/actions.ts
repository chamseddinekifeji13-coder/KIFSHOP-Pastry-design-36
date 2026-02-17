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

export async function fetchTransactions(tenantId: string): Promise<Transaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) { console.error("Error fetching transactions:", error.message); return [] }
  return (data || []).map((t) => ({
    id: t.id, tenantId: t.tenant_id, type: t.type as "entree" | "sortie",
    amount: Number(t.amount), category: t.category, paymentMethod: t.payment_method,
    reference: t.reference, description: t.description, orderId: t.order_id,
    createdBy: t.created_by, createdAt: t.created_at,
  }))
}

export async function createTransaction(tenantId: string, data: {
  type: "entree" | "sortie"; amount: number; category: string;
  paymentMethod?: string; reference?: string; description?: string
}): Promise<Transaction | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row, error } = await supabase.from("transactions").insert({
    tenant_id: tenantId, type: data.type, amount: data.amount, category: data.category,
    payment_method: data.paymentMethod || "cash", reference: data.reference || null,
    description: data.description || null, created_by: user?.id || null,
  }).select().single()
  if (error || !row) { console.error("Error creating transaction:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, type: row.type, amount: Number(row.amount),
    category: row.category, paymentMethod: row.payment_method, reference: row.reference,
    description: row.description, orderId: row.order_id, createdBy: row.created_by, createdAt: row.created_at }
}
