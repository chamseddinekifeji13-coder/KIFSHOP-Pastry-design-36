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
    const type = searchParams.get('type') || 'daily'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = await createClient()
    let query = supabase
      .from('cash_closures')
      .select('*')
      .eq('tenant_id', session.tenantId)

    let data = []

    switch (type) {
      case 'daily':
        // Last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('closure_date', thirtyDaysAgo.toISOString().split('T')[0])
        const { data: dailyData } = await query.order('closure_date', { ascending: true })
        data = dailyData || []
        break

      case 'monthly':
        // Last 12 months
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        const { data: allClosures } = await query.gte('closure_date', oneYearAgo.toISOString().split('T')[0])

        // Group by month
        const monthlyMap = new Map<string, any>()
        for (const closure of allClosures || []) {
          const date = new Date(closure.closure_date)
          const monthKey = date.toISOString().slice(0, 7) // YYYY-MM
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
              month: new Date(monthKey + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
              total_sales: 0,
              total_collections: 0,
              total_cash_income: 0,
              total_card_income: 0,
              total_expenses: 0,
              transactions_count: 0,
              collections_count: 0,
            })
          }

          const monthData = monthlyMap.get(monthKey)!
          monthData.total_sales += closure.total_sales || 0
          monthData.total_collections += closure.total_collections || 0
          monthData.total_cash_income += closure.total_cash_income || 0
          monthData.total_card_income += closure.total_card_income || 0
          monthData.total_expenses += closure.total_expenses || 0
          monthData.transactions_count += closure.transactions_count || 0
          monthData.collections_count += closure.collections_count || 0
        }

        data = Array.from(monthlyMap.values())
        break

      case 'annual':
        // All years
        const { data: allData } = await query
        
        // Group by year
        const yearlyMap = new Map<string, any>()
        for (const closure of allData || []) {
          const year = new Date(closure.closure_date).getFullYear().toString()
          
          if (!yearlyMap.has(year)) {
            yearlyMap.set(year, {
              year,
              total_sales: 0,
              total_collections: 0,
              total_cash_income: 0,
              total_card_income: 0,
              total_expenses: 0,
              transactions_count: 0,
              collections_count: 0,
            })
          }

          const yearData = yearlyMap.get(year)!
          yearData.total_sales += closure.total_sales || 0
          yearData.total_collections += closure.total_collections || 0
          yearData.total_cash_income += closure.total_cash_income || 0
          yearData.total_card_income += closure.total_card_income || 0
          yearData.total_expenses += closure.total_expenses || 0
          yearData.transactions_count += closure.transactions_count || 0
          yearData.collections_count += closure.collections_count || 0
        }

        data = Array.from(yearlyMap.values()).sort((a, b) => b.year.localeCompare(a.year))
        break

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Treasury] Report Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
