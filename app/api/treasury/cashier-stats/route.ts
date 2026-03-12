import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = await createClient()

    // Fetch all transactions for the period with cashier info
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('created_by, created_by_name, amount, type, payment_method')
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

    // Group and aggregate by cashier
    const cashierMap = new Map<string, any>()

    for (const transaction of transactions || []) {
      const cashierId = transaction.created_by
      
      if (!cashierMap.has(cashierId)) {
        cashierMap.set(cashierId, {
          cashierId,
          cashierName: transaction.created_by_name || 'Inconnu',
          totalTransactions: 0,
          totalCollections: 0,
          totalAmount: 0,
          transactionsByType: {},
          paymentMethods: {},
        })
      }

      const cashier = cashierMap.get(cashierId)!
      cashier.totalTransactions++

      if (transaction.type === 'collection') {
        cashier.totalCollections++
        cashier.totalAmount += transaction.amount || 0
      }

      // Track by transaction type
      cashier.transactionsByType[transaction.type] =
        (cashier.transactionsByType[transaction.type] || 0) + 1

      // Track by payment method
      cashier.paymentMethods[transaction.payment_method || 'cash'] =
        (cashier.paymentMethods[transaction.payment_method || 'cash'] || 0) + 1
    }

    const data = Array.from(cashierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Treasury] Cashier Stats Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate cashier statistics' },
      { status: 500 }
    )
  }
}
