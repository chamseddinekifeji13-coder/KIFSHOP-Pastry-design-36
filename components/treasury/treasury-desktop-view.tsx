"use client"

import { useMemo, useState } from "react"
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Wallet, Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { useTransactions } from "@/hooks/use-tenant-data"
import { NewTransactionDrawer } from "./new-transaction-drawer"
import { CashSessionManagement } from "./cash-session-management"
import { QuickOrderCollection } from "./quick-order-collection"
import { RevenueReportsView } from "./revenue-reports-view"
import { CashierPerformanceView } from "./cashier-performance-view"
import { useI18n } from "@/lib/i18n/context"
import { PinProtected } from "@/components/ui/pin-protected"

export function TreasuryDesktopView() {
  const { t } = useI18n()
  const { data: transactions, isLoading, error, mutate } = useTransactions()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const allTransactions = transactions || []
  const totalInflow = allTransactions.filter(t => t.type === "entree").reduce((sum, t) => sum + t.amount, 0)
  const totalOutflow = allTransactions.filter(t => t.type === "sortie").reduce((sum, t) => sum + t.amount, 0)
  const cashFlow = totalInflow - totalOutflow

  const today = new Date().toISOString().split("T")[0]
  const todayIn = allTransactions.filter(t => t.type === "entree" && t.createdAt?.startsWith(today)).reduce((sum, t) => sum + t.amount, 0)
  const todayOut = allTransactions.filter(t => t.type === "sortie" && t.createdAt?.startsWith(today)).reduce((sum, t) => sum + t.amount, 0)

  const expensesByCategory = useMemo(() => {
    const expenses = allTransactions.filter(t => t.type === "sortie")
    const grouped: Record<string, number> = {}
    expenses.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + t.amount })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [allTransactions])

  const chartColors = ["#4A7C59", "#F4A261", "#E76F51", "#264653", "#2A9D8F"]

  return (
    <div className="space-y-6 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("treasury.title")}</h1>
          <p className="text-muted-foreground">{t("treasury.subtitle")}</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />{t("treasury.new_transaction")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="session">Caisse</TabsTrigger>
          <TabsTrigger value="collection">Encaissement</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
          <TabsTrigger value="cashiers">Caissiers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("treasury.balance")}</p>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                    ) : (
                      <p className="text-xl font-bold">{cashFlow.toLocaleString("fr-TN")} TND</p>
                    )}
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
                    <p className="text-sm text-muted-foreground">{t("treasury.total_inflow")}</p>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                    ) : (
                      <p className="text-xl font-bold text-primary">+{totalInflow.toLocaleString("fr-TN")} TND</p>
                    )}
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
                    <p className="text-sm text-muted-foreground">{t("treasury.total_outflow")}</p>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                    ) : (
                      <p className="text-xl font-bold text-destructive">-{totalOutflow.toLocaleString("fr-TN")} TND</p>
                    )}
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
                    <p className="text-sm text-muted-foreground">{t("treasury.today_margin")}</p>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                    ) : (
                      <p className="text-xl font-bold">{(todayIn - todayOut).toLocaleString("fr-TN")} TND</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Journal des transactions</CardTitle>
                <CardDescription>Historique des entrees et sorties</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Wallet className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium">Aucune transaction</p>
                    <p className="text-xs text-muted-foreground mt-1">Enregistrez votre premiere transaction</p>
                    <Button className="mt-4" onClick={() => setDrawerOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />Nouvelle transaction
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allTransactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString("fr-TN")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {t.type === "entree" ? (
                                <ArrowUpCircle className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4 text-destructive" />
                              )}
                              {t.description || t.category}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{t.category}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${t.type === "entree" ? "text-primary" : "text-destructive"}`}>
                            {t.type === "entree" ? "+" : "-"}{t.amount.toLocaleString("fr-TN")} TND
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repartition des depenses</CardTitle>
                <CardDescription>Par categorie</CardDescription>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune depense enregistree</p>
                ) : (
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
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-card p-2 shadow-sm">
                                <p className="text-sm font-medium">{d.name}</p>
                                <p className="text-sm text-muted-foreground">{d.value.toLocaleString("fr-TN")} TND</p>
                              </div>
                            )
                          }
                          return null
                        }} />
                        <Legend formatter={v => <span className="text-xs">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="session">
          <CashSessionManagement />
        </TabsContent>

        <TabsContent value="collection">
          <QuickOrderCollection />
        </TabsContent>

        <TabsContent value="reports">
          <PinProtected
            title="Rapports de ventes"
            description="Les rapports financiers sont reserves aux gerants et proprietaires pour des raisons de confidentialite."
            requiredRole="gerant"
          >
            <RevenueReportsView />
          </PinProtected>
        </TabsContent>

        <TabsContent value="cashiers">
          <PinProtected
            title="Performance des caissiers"
            description="L'acces aux statistiques de performance est reserve aux gerants et proprietaires."
            requiredRole="gerant"
          >
            <CashierPerformanceView />
          </PinProtected>
        </TabsContent>
      </Tabs>

      <NewTransactionDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => mutate()} />
    </div>
  )
}
