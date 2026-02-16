"use client"

import React from "react"
import { AlertTriangle, Wallet, CheckCircle, Package, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRawMaterials, useOrders, useTransactions } from "@/hooks/use-tenant-data"

interface Alert {
  id: string
  type: "critical" | "warning" | "success"
  icon: React.ElementType
  title: string
  description: string
}

export function AlertsPanel() {
  const { data: rawMaterials, isLoading: rmLoading } = useRawMaterials()
  const { data: orders, isLoading: ordLoading } = useOrders()
  const { data: transactions, isLoading: txLoading } = useTransactions()

  const isLoading = rmLoading || ordLoading || txLoading

  // Calculate real alerts
  const criticalMaterials = (rawMaterials || []).filter((m) => m.currentStock <= m.minStock && m.minStock > 0)
  const readyOrders = (orders || []).filter((o) => o.status === "pret")

  const totalIn = (transactions || []).filter((t) => t.type === "entree").reduce((sum, t) => sum + t.amount, 0)
  const totalOut = (transactions || []).filter((t) => t.type === "sortie").reduce((sum, t) => sum + t.amount, 0)
  const cashFlow = totalIn - totalOut

  const alerts: Alert[] = []

  criticalMaterials.forEach((material) => {
    alerts.push({
      id: `stock-${material.id}`,
      type: "critical",
      icon: Package,
      title: `${material.name} < ${material.minStock}${material.unit}`,
      description: `Stock actuel: ${material.currentStock}${material.unit}`,
    })
  })

  if (cashFlow < 1000 && (transactions || []).length > 0) {
    alerts.push({
      id: "treasury",
      type: "warning",
      icon: Wallet,
      title: "Tresorerie < 1000 TND",
      description: `Solde actuel: ${cashFlow.toLocaleString("fr-TN")} TND`,
    })
  }

  if (readyOrders.length > 0) {
    alerts.push({
      id: "ready-orders",
      type: "success",
      icon: CheckCircle,
      title: `${readyOrders.length} commande${readyOrders.length > 1 ? "s" : ""} prete${readyOrders.length > 1 ? "s" : ""}`,
      description: "En attente de livraison/encaissement",
    })
  }

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "critical": return { bg: "bg-destructive/10", border: "border-destructive/20", icon: "text-destructive" }
      case "warning": return { bg: "bg-warning/10", border: "border-warning/20", icon: "text-warning" }
      case "success": return { bg: "bg-primary/10", border: "border-primary/20", icon: "text-primary" }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Alertes urgentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune alerte pour le moment
          </p>
        ) : (
          alerts.map((alert) => {
            const styles = getAlertStyles(alert.type)
            return (
              <div key={alert.id} className={`flex items-start gap-3 rounded-lg border p-3 ${styles.bg} ${styles.border}`}>
                <alert.icon className={`h-4 w-4 mt-0.5 ${styles.icon}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
