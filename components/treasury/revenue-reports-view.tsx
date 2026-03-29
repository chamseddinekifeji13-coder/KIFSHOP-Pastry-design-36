"use client"

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Users, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DailyClosure {
  closure_date: string
  total_sales: number
  total_collections: number
  total_cash_income: number
  total_card_income: number
  total_expenses: number
  transactions_count: number
  closing_balance: number
  expected_balance: number
  difference: number
}

export function RevenueReportsView() {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'annual'>('daily')
  
  // Fetch revenue data with real-time synchronization
  const { data: revenueData, error: revenueError, isLoading, mutate } = useSWR(
    `/api/treasury/revenue?type=${reportType}`,
    (url: string) => fetch(url).then(res => res.json()),
    {
      refreshInterval: 5000,  // Refresh every 5 seconds for real-time sync
      revalidateOnFocus: true,  // Refresh when user returns to tab
      revalidateOnReconnect: true,  // Refresh after reconnection
      dedupingInterval: 500,  // Quick deduplication
      keepPreviousData: true,  // Keep data while revalidating
    }
  )
  
  const stats = useMemo(() => {
    const data = revenueData?.data || []
    
    // Sum both total_sales AND total_collections (they track different things)
    // total_sales = income from transactions (POS sales, etc.)
    // total_collections = income from order collections
    const totalSales = data.reduce((sum: number, d: any) => sum + (d.total_sales || 0), 0)
    const totalCollections = data.reduce((sum: number, d: any) => sum + (d.total_collections || 0), 0)
    const total = totalSales + totalCollections
    const transactionsCount = data.reduce((sum: number, d: any) => sum + (d.transactions_count || 0), 0)
    const avgTransaction = transactionsCount > 0 ? total / transactionsCount : 0
    const totalExpenses = data.reduce((sum: number, d: any) => sum + (d.total_expenses || 0), 0)

    return {
      totalRevenue: total,
      averageTransaction: avgTransaction,
      totalExpenses: totalExpenses,
      netRevenue: total - totalExpenses,
      recordCount: data.length,
    }
  }, [revenueData])

  const handlePrint = () => {
    window.print()
  }

  const reportTypeLabel = reportType === 'daily' ? 'Quotidien' : reportType === 'monthly' ? 'Mensuel' : 'Annuel'

  return (
    <div className="space-y-6 print:p-4" id="revenue-report">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-2xl font-bold text-center">Rapport Financier - {reportTypeLabel}</h1>
        <p className="text-center text-gray-600">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      {/* Print Button */}
      <div className="flex justify-end print:hidden">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimer le rapport
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recettes</p>
              <p className="text-2xl font-bold">{stats?.totalRevenue.toFixed(3) || '0.000'} TND</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dépenses</p>
              <p className="text-2xl font-bold">{stats?.totalExpenses.toFixed(3) || '0.000'} TND</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bénéfice net</p>
              <p className="text-2xl font-bold">{stats?.netRevenue.toFixed(3) || '0.000'} TND</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Moyenne/Transaction</p>
              <p className="text-2xl font-bold">{stats?.averageTransaction.toFixed(3) || '0.000'} TND</p>
            </div>
            <Users className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={reportType} onValueChange={(v: any) => setReportType(v)}>
        <TabsList>
          <TabsTrigger value="daily">Quotidien</TabsTrigger>
          <TabsTrigger value="monthly">Mensuel</TabsTrigger>
          <TabsTrigger value="annual">Annuel</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recettes Quotidiennes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="closure_date" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toFixed(3)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_sales"
                  stroke="#3b82f6"
                  name="Ventes"
                />
                <Line
                  type="monotone"
                  dataKey="total_collections"
                  stroke="#10b981"
                  name="Encaissements"
                />
                <Line
                  type="monotone"
                  dataKey="total_expenses"
                  stroke="#ef4444"
                  name="Dépenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recettes Mensuelles</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toFixed(3)} />
                <Legend />
                <Bar dataKey="total_sales" fill="#3b82f6" name="Ventes" />
                <Bar dataKey="total_collections" fill="#10b981" name="Encaissements" />
                <Bar dataKey="total_expenses" fill="#ef4444" name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="annual">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recettes Annuelles</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toFixed(3)} />
                <Legend />
                <Bar dataKey="total_sales" fill="#3b82f6" name="Ventes" />
                <Bar dataKey="total_collections" fill="#10b981" name="Encaissements" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
