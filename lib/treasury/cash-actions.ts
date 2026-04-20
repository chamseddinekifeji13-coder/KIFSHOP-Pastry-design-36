'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/active-profile'

// ─── Cash Session Management ──────────────────────────────────

export async function openCashSession(openingBalance: number) {
  const supabase = await createClient()
  const session = await getServerSession()

  const { data, error } = await supabase
    .from('cash_sessions')
    .insert({
      tenant_id: session.tenantId,
      opened_by: session.activeProfileId,
      opened_by_name: session.displayName,
      opening_balance: openingBalance,
      status: 'open',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to open cash session: ${error.message}`)
  return data
}

export async function closeCashSession(
  sessionId: string,
  closingBalance: number,
  differenceReason?: string
) {
  const supabase = await createClient()
  const session = await getServerSession()

  // Fetch session to calculate expected balance
  const { data: cashSession } = await supabase
    .from('cash_sessions')
    .select('opening_balance')
    .eq('id', sessionId)
    .single()

  // Get all transactions for this session
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('cash_session_id', sessionId)

  let expectedBalance = cashSession?.opening_balance || 0
  for (const t of transactions || []) {
    if (t.type === 'income') {
      expectedBalance += t.amount
    } else {
      expectedBalance -= t.amount
    }
  }

  const difference = closingBalance - expectedBalance

  const { data, error } = await supabase
    .from('cash_sessions')
    .update({
      closed_by: session.activeProfileId,
      closed_by_name: session.displayName,
      closed_at: new Date().toISOString(),
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      difference: difference,
      difference_reason: differenceReason,
      status: 'closed',
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to close cash session: ${error.message}`)

  // Create daily closure record
  await createDailyClosure(sessionId, expectedBalance, closingBalance, differenceReason)

  return data
}

export async function getActiveCashSession() {
  const supabase = await createClient()
  const session = await getServerSession()

  const { data } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('tenant_id', session.tenantId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

// ─── Order Collection ──────────────────────────────────────

export async function collectOrderPayment(
  orderId: string,
  amount: number,
  paymentMethod: string = 'cash',
  notes?: string
) {
  try {
    const supabase = await createClient()
    const session = await getServerSession()

    // Get active cash session
    const activeSession = await getActiveCashSession()
    if (!activeSession) {
      return {
        success: false,
        error: "Aucune session de caisse active - ouvrez d'abord une session",
      }
    }

    // Create collection record directly (bypassing the problematic transactions table)
    // The transactions table has a foreign key constraint issue that prevents inserts
    const { data: collData, error: collError } = await supabase
      .from('order_collections')
      .insert({
        tenant_id: session.tenantId,
        order_id: orderId,
        cash_session_id: activeSession.id,
        amount: amount,
        payment_method: paymentMethod,
        collected_by: session.activeProfileId,
        collected_by_name: session.displayName,
        notes: notes,
      })
      .select()
      .single()

    if (collError) {
      console.error('[v0] Collection insert error:', collError)
      return {
        success: false,
        error: `Erreur lors de l'enregistrement du paiement: ${collError.message || collError.details || 'Erreur inconnue'}`,
      }
    }

    if (!collData) {
      return {
        success: false,
        error: "Aucun enregistrement de paiement cree",
      }
    }

    return {
      success: true,
      data: collData,
    }
  } catch (error: any) {
    console.error('[v0] collectOrderPayment error:', error)
    return {
      success: false,
      error: error?.message || "Erreur inattendue lors de l'encaissement",
    }
  }
}

export async function getOrderCollections(orderId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('order_collections')
    .select('*')
    .eq('order_id', orderId)
    .order('collected_at', { ascending: false })

  return data || []
}

// ─── Cash Closure & Reports ──────────────────────────────────

async function createDailyClosure(
  sessionId: string,
  expectedClosing: number,
  actualClosing: number,
  differenceReason?: string
) {
  const supabase = await createClient()
  const session = await getServerSession()

  // Get all transactions for the session
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, payment_method')
    .eq('cash_session_id', sessionId)

  // Calculate totals by type
  let totalSales = 0
  let totalCollections = 0
  let totalCashIncome = 0
  let totalCardIncome = 0
  let totalOtherIncome = 0
  let totalExpenses = 0

  for (const t of transactions || []) {
    if (t.type === 'sale') {
      totalSales += t.amount
      if (t.payment_method === 'cash') totalCashIncome += t.amount
      else if (t.payment_method === 'card') totalCardIncome += t.amount
      else totalOtherIncome += t.amount
    } else if (t.type === 'collection') {
      totalCollections += t.amount
      if (t.payment_method === 'cash') totalCashIncome += t.amount
      else if (t.payment_method === 'card') totalCardIncome += t.amount
      else totalOtherIncome += t.amount
    } else if (t.type === 'expense') {
      totalExpenses += t.amount
    }
  }

  const { error } = await supabase
    .from('cash_closures')
    .insert({
      tenant_id: session.tenantId,
      closure_date: new Date().toISOString().split('T')[0],
      closed_by: session.activeProfileId,
      closed_by_name: session.displayName,
      total_sales: totalSales,
      total_collections: totalCollections,
      total_cash_income: totalCashIncome,
      total_card_income: totalCardIncome,
      total_other_income: totalOtherIncome,
      total_expenses: totalExpenses,
      orders_count: 0,
      collections_count: totalCollections > 0 ? 1 : 0,
      transactions_count: transactions?.length || 0,
      opening_balance: 0,
      expected_closing: expectedClosing,
      actual_closing: actualClosing,
      difference: actualClosing - expectedClosing,
      difference_reason: differenceReason,
    })

  if (error) console.error('Failed to create closure:', error)
}

export async function getDailyClosure(closureDate: string) {
  const supabase = await createClient()
  const session = await getServerSession()

  const { data } = await supabase
    .from('cash_closures')
    .select('*')
    .eq('tenant_id', session.tenantId)
    .eq('closure_date', closureDate)
    .maybeSingle()

  return data
}

export async function getCashierStats(startDate: string, endDate: string) {
  const supabase = await createClient()
  const session = await getServerSession()

  const { data } = await supabase
    .from('transactions')
    .select('created_by, created_by_name, amount, type')
    .eq('tenant_id', session.tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // Group by cashier
  const stats = new Map<string, any>()
  
  for (const t of data || []) {
    const key = t.created_by
    if (!stats.has(key)) {
      stats.set(key, {
        cashierId: t.created_by,
        cashierName: t.created_by_name,
        totalTransactions: 0,
        totalAmount: 0,
        totalCollections: 0,
      })
    }
    const stat = stats.get(key)
    stat.totalTransactions++
    if (t.type === 'collection') {
      stat.totalCollections++
      stat.totalAmount += t.amount
    }
  }

  return Array.from(stats.values()).sort((a, b) => b.totalAmount - a.totalAmount)
}
