"use client"

import { Wallet, TrendingUp, AlertTriangle, ClipboardList } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTenant } from "@/lib/tenant-context"
import { getKPIs } from "@/lib/mock-data"

export function KPICards() {
  const { currentTenant } = useTenant()
  const kpis = getKPIs(currentTenant.id)

  const cards = [
    {
      title: "Trésorerie",
      value: `${kpis.cashFlow.toLocaleString("fr-TN")} TND`,
      subtitle: kpis.cashFlow > 1000 ? "Solde positif" : "Attention au solde",
      icon: Wallet,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: kpis.cashFlow > 1000 ? "up" : "down",
    },
    {
      title: "CA du jour",
      value: `${kpis.todayRevenue.toLocaleString("fr-TN")} TND`,
      subtitle: `${kpis.todayTransactions} transaction${kpis.todayTransactions > 1 ? "s" : ""}`,
      icon: TrendingUp,
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary-foreground",
      trend: "up",
    },
    {
      title: "Stocks critiques",
      value: kpis.criticalStockCount.toString(),
      subtitle: `MP < seuil`,
      icon: AlertTriangle,
      iconBg: kpis.criticalStockCount > 0 ? "bg-destructive/10" : "bg-success/10",
      iconColor: kpis.criticalStockCount > 0 ? "text-destructive" : "text-success",
      trend: kpis.criticalStockCount > 0 ? "warning" : "up",
    },
    {
      title: "Commandes en attente",
      value: kpis.pendingOrdersCount.toString(),
      subtitle: `${kpis.readyOrdersCount} prête${kpis.readyOrdersCount > 1 ? "s" : ""} à livrer`,
      icon: ClipboardList,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: "neutral",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
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
