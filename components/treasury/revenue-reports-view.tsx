import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Calendar, TrendingUp, DollarSign, Users } from 'lucide-react'

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
  
  // Fetch revenue data
  const { data: revenueData } = useSWR(
    `/api/treasury/revenue?type=${reportType}`,
    fetch
  )

  const stats = useMemo(() => {
    if (!revenueData) return null

    const data = revenueData.data || []
    if (data.length === 0) return null

    const total = data.reduce((sum, d: any) => sum + (d.total_collections || d.total_sales || 0), 0)
    const avgTransaction = total / data.reduce((sum, d: any) => sum + d.transactions_count, 0)
    const totalExpenses = data.reduce((sum, d: any) => sum + d.total_expenses, 0)

    return {
      totalRevenue: total,
      averageTransaction: avgTransaction,
      totalExpenses: totalExpenses,
      netRevenue: total - totalExpenses,
      recordCount: data.length,
    }
  }, [revenueData])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
