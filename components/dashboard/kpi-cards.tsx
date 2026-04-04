"use client"

import { Wallet, TrendingUp, AlertTriangle, ClipboardList, Loader2, Banknote } from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useTransactions, useRawMaterials, useOrders, usePaymentCollections } from "@/hooks/use-tenant-data"

export function KPICards() {
  const { data: transactions, isLoading: txLoading } = useTransactions()
  const { data: rawMaterials, isLoading: rmLoading } = useRawMaterials()
  const { data: orders, isLoading: ordLoading } = useOrders()
  const { data: paymentCollections, isLoading: pcLoading } = usePaymentCollections()

  const isLoading = txLoading || rmLoading || ordLoading || pcLoading

  // Date locale correcte (pas UTC)
  const today = new Date().toLocaleDateString("fr-CA")

  // Mémorisation des calculs coûteux
  const kpiData = useMemo(() => {
    const todayTransactions = (transactions || []).filter(
      (t) => t.createdAt?.startsWith(today)
    )
    const todayRevenue = todayTransactions
      .filter((t) => t.type === "entree")
      .reduce((sum, t) => sum + (t.amount ?? 0), 0)
    const todayCount = todayTransactions.filter((t) => t.type === "entree").length

    const totalIn = (transactions || [])
      .filter((t) => t.type === "entree")
      .reduce((sum, t) => sum + (t.amount ?? 0), 0)
    const totalOut = (transactions || [])
      .filter((t) => t.type === "sortie")
      .reduce((sum, t) => sum + (t.amount ?? 0), 0)
    const cashFlow = totalIn - totalOut

    const criticalStockCount = (rawMaterials || []).filter(
      (m) => m.currentStock <= m.minStock
    ).length

    const pendingOrders = (orders || []).filter(
      (o) => o.status === "nouveau" || o.status === "en-preparation"
    )
    const readyOrders = (orders || []).filter((o) => o.status === "pret")

    // Encaissements du jour depuis payment_collections
    const todayCollections = (paymentCollections || []).filter(
      (p) => p.collectedAt?.startsWith(today)
    )
    const todayCollectionsTotal = todayCollections.reduce(
      (sum, p) => sum + (p.amount ?? 0), 0
    )
    const todayCollectionsCount = todayCollections.length

    return {
      todayRevenue,
      todayCount,
      cashFlow,
      criticalStockCount,
      pendingOrdersCount: pendingOrders.length,
      readyOrdersCount: readyOrders.length,
      todayCollectionsTotal,
      todayCollectionsCount,
    }
  }, [transactions, rawMaterials, orders, paymentCollections, today])

  const cards = [
    {
      title: "Trésorerie",
      value: `${kpiData.cashFlow.toLocaleString("fr-TN")} TND`,
      subtitle: kpiData.cashFlow >= 0 ? "Solde positif" : "Attention au solde",
      icon: Wallet,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "CA du jour",
      value: `${kpiData.todayRevenue.toLocaleString("fr-TN")} TND`,
      subtitle: `${kpiData.todayCount} transaction${kpiData.todayCount !== 1 ? "s" : ""}`,
      icon: TrendingUp,
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary-foreground",
    },
    {
      title: "Encaissements du jour",
      value: `${kpiData.todayCollectionsTotal.toLocaleString("fr-TN")} TND`,
      subtitle: `${kpiData.todayCollectionsCount} encaissement${kpiData.todayCollectionsCount !== 1 ? "s" : ""} commandes`,
      icon: Banknote,
      iconBg: kpiData.todayCollectionsCount > 0 ? "bg-green-500/10" : "bg-muted",
      iconColor: kpiData.todayCollectionsCount > 0 ? "text-green-600" : "text-muted-foreground",
    },
    {
      title: "Stocks critiques",
      value: kpiData.criticalStockCount.toString(),
      subtitle: "MP < seuil",
      icon: AlertTriangle,
      iconBg: kpiData.criticalStockCount > 0 ? "bg-destructive/10" : "bg-primary/10",
      iconColor: kpiData.criticalStockCount > 0 ? "text-destructive" : "text-primary",
    },
    {
      title: "Commandes en attente",
      value: kpiData.pendingOrdersCount.toString(),
      subtitle: `${kpiData.readyOrdersCount} prête${kpiData.readyOrdersCount !== 1 ? "s" : ""} à livrer`,
      icon: ClipboardList,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  {isLoading ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
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
                  <Icon className={`h-5 w-5 ${card.iconColor}`} aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
