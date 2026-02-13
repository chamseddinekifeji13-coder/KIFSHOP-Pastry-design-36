"use client"

import { useMemo, useState } from "react"
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Wallet, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { useTenant } from "@/lib/tenant-context"
import { getTransactions, getKPIs } from "@/lib/mock-data"
import { NewTransactionDrawer } from "./new-transaction-drawer"

export function TreasuryView() {
  const { currentTenant } = useTenant()
  const transactions = getTransactions(currentTenant.id)
  const kpis = getKPIs(currentTenant.id)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const totalInflow = transactions.filter(t => t.type === "inflow").reduce((sum, t) => sum + t.amount, 0)
  const totalOutflow = transactions.filter(t => t.type === "outflow").reduce((sum, t) => sum + t.amount, 0)

  // Group expenses by category for donut chart
  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === "outflow")
    const grouped: Record<string, number> = {}

    expenses.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount
    })

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const chartColors = ["#4A7C59", "#F4A261", "#E76F51", "#264653", "#2A9D8F"]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trésorerie</h1>
          <p className="text-muted-foreground">
            Suivez vos entrées et sorties de caisse
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle transaction
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solde Caisse</p>
                <p className="text-xl font-bold">{kpis.cashFlow.toLocaleString("fr-TN")} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ArrowUpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entrées</p>
                <p className="text-xl font-bold text-primary">+{totalInflow.toLocaleString("fr-TN")} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sorties</p>
                <p className="text-xl font-bold text-destructive">-{totalOutflow.toLocaleString("fr-TN")} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marge Brute (Jour)</p>
                <p className="text-xl font-bold">{kpis.grossMargin.toLocaleString("fr-TN")} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transactions Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Journal des transactions</CardTitle>
            <CardDescription>Historique des entrées et sorties</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString("fr-TN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.type === "inflow" ? (
                          <ArrowUpCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-destructive" />
                        )}
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === "inflow" ? "text-primary" : "text-destructive"
                    }`}>
                      {transaction.type === "inflow" ? "+" : "-"}
                      {transaction.amount.toLocaleString("fr-TN")} TND
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expenses Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des dépenses</CardTitle>
            <CardDescription>Par catégorie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-card p-2 shadow-sm">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.value.toLocaleString("fr-TN")} TND
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <NewTransactionDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  )
}
