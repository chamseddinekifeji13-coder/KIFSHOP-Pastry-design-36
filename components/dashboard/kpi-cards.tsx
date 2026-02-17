"use client"

import { Wallet, TrendingUp, AlertTriangle, ClipboardList, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTransactions, useRawMaterials, useOrders } from "@/hooks/use-tenant-data"

export function KPICards() {
  const { data: transactions, isLoading: txLoading } = useTransactions()
  const { data: rawMaterials, isLoading: rmLoading } = useRawMaterials()
  const { data: orders, isLoading: ordLoading } = useOrders()

  const isLoading = txLoading || rmLoading || ordLoading

  // Calculate real KPIs
  const today = new Date().toISOString().split("T")[0]
  const todayTransactions = (transactions || []).filter(
    (t) => t.createdAt?.startsWith(today)
  )
  const todayRevenue = todayTransactions
    .filter((t) => t.type === "entree")
    .reduce((sum, t) => sum + t.amount, 0)
  const todayCount = todayTransactions.filter((t) => t.type === "entree").length

  const totalIn = (transactions || []).filter((t) => t.type === "entree").reduce((sum, t) => sum + t.amount, 0)
  const totalOut = (transactions || []).filter((t) => t.type === "sortie").reduce((sum, t) => sum + t.amount, 0)
  const cashFlow = totalIn - totalOut

  const criticalStockCount = (rawMaterials || []).filter(
    (m) => m.currentStock <= m.minStock
  ).length

  const pendingOrders = (orders || []).filter(
    (o) => o.status === "nouveau" || o.status === "en-preparation"
  )
  const readyOrders = (orders || []).filter((o) => o.status === "pret")

  const cards = [
    {
      title: "Tresorerie",
      value: `${cashFlow.toLocaleString("fr-TN")} TND`,
      subtitle: cashFlow >= 0 ? "Solde positif" : "Attention au solde",
      icon: Wallet,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "CA du jour",
      value: `${todayRevenue.toLocaleString("fr-TN")} TND`,
      subtitle: `${todayCount} transaction${todayCount !== 1 ? "s" : ""}`,
      icon: TrendingUp,
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary-foreground",
    },
    {
      title: "Stocks critiques",
      value: criticalStockCount.toString(),
      subtitle: "MP < seuil",
      icon: AlertTriangle,
      iconBg: criticalStockCount > 0 ? "bg-destructive/10" : "bg-primary/10",
      iconColor: criticalStockCount > 0 ? "text-destructive" : "text-primary",
    },
    {
      title: "Commandes en attente",
      value: pendingOrders.length.toString(),
      subtitle: `${readyOrders.length} prete${readyOrders.length !== 1 ? "s" : ""} a livrer`,
      icon: ClipboardList,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                {isLoading ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Chargement...</span>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-2xl font-bold tracking-tight">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
                  </>
                )}
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
