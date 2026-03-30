import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSession, serverErrorResponse } from '@/lib/api-helpers'

export async function GET(request: Request) {
  // Get session with proper error handling
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = await createClient()

    // Fetch all transactions for the period with cashier info - include category for proper classification
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('created_by, created_by_name, amount, type, category, payment_method')
      .eq('tenant_id', session.tenantId)
      .gte('created_at', startDate ? `${startDate}T00:00:00` : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate ? `${endDate}T23:59:59` : new Date().toISOString())

    if (error) {
      console.error('Failed to fetch cashier stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cashier statistics' },
        { status: 500 }
      )
    }

    // Also fetch order collections
    const { data: orderCollections } = await supabase
      .from('order_collections')
      .select('collected_by, collected_by_name, amount')
      .eq('tenant_id', session.tenantId)
      .gte('collected_at', startDate ? `${startDate}T00:00:00` : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('collected_at', endDate ? `${endDate}T23:59:59` : new Date().toISOString())

    // Group and aggregate by cashier
    const cashierMap = new Map<string, any>()

    for (const transaction of transactions || []) {
      const cashierId = transaction.created_by || 'system'
      
      if (!cashierMap.has(cashierId)) {
        cashierMap.set(cashierId, {
          cashierId,
          cashierName: transaction.created_by_name || (cashierId === 'system' ? 'Système (Auto)' : 'Inconnu'),
          totalTransactions: 0,
          totalCollections: 0,
          totalAmount: 0,
          transactionsByType: {},
          paymentMethods: {},
        })
      }

      const cashier = cashierMap.get(cashierId)!
      cashier.totalTransactions++

      // Count income transactions - check both type AND category
      const incomeTypes = ['income', 'entree']
      const incomeCategories = ['vente_pos', 'vente_comptoir', 'pos_sale', 'collection', 'Commande client', 'Vente comptoir']
      const isIncome = incomeTypes.includes(transaction.type) || incomeCategories.includes(transaction.category)
      
      if (isIncome) {
        cashier.totalCollections++
        cashier.totalAmount += Number(transaction.amount) || 0
      }

      // Track by transaction type
      cashier.transactionsByType[transaction.type] =
        (cashier.transactionsByType[transaction.type] || 0) + 1

      // Track by payment method
      cashier.paymentMethods[transaction.payment_method || 'cash'] =
        (cashier.paymentMethods[transaction.payment_method || 'cash'] || 0) + 1
    }

    // Process order collections
    for (const collection of orderCollections || []) {
      const cashierId = collection.collected_by || 'system'
      
      if (!cashierMap.has(cashierId)) {
        cashierMap.set(cashierId, {
          cashierId,
          cashierName: collection.collected_by_name || (cashierId === 'system' ? 'Système (Auto)' : 'Inconnu'),
          totalTransactions: 0,
          totalCollections: 0,
          totalAmount: 0,
          transactionsByType: {},
          paymentMethods: {},
        })
      }

      const cashier = cashierMap.get(cashierId)!
      cashier.totalTransactions++
      cashier.totalCollections++
      cashier.totalAmount += Number(collection.amount) || 0
    }

    const data = Array.from(cashierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
