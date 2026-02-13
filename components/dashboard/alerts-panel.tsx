"use client"

import React from "react"

import { AlertTriangle, Wallet, CheckCircle, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTenant } from "@/lib/tenant-context"
import { getKPIs, getRawMaterials, getOrders } from "@/lib/mock-data"

interface Alert {
  id: string
  type: "critical" | "warning" | "success"
  icon: React.ElementType
  title: string
  description: string
}

export function AlertsPanel() {
  const { currentTenant } = useTenant()
  const kpis = getKPIs(currentTenant.id)
  const rawMaterials = getRawMaterials(currentTenant.id)
  const orders = getOrders(currentTenant.id)

  const criticalMaterials = rawMaterials.filter(m => m.status === "critical")
  const readyOrders = orders.filter(o => o.status === "pret")

  const alerts: Alert[] = []

  // Add critical stock alerts
  criticalMaterials.forEach(material => {
    alerts.push({
      id: `stock-${material.id}`,
      type: "critical",
      icon: Package,
      title: `${material.name} < ${material.safetyThreshold}${material.unit}`,
      description: `Stock actuel: ${material.quantity}${material.unit}`,
    })
  })

  // Add treasury alert if low
  if (kpis.cashFlow < 1000) {
    alerts.push({
      id: "treasury",
      type: "warning",
      icon: Wallet,
      title: "Trésorerie < 1000 TND",
      description: `Solde actuel: ${kpis.cashFlow.toLocaleString("fr-TN")} TND`,
    })
  }

  // Add ready orders alert
  if (readyOrders.length > 0) {
    alerts.push({
      id: "ready-orders",
      type: "success",
      icon: CheckCircle,
      title: `${readyOrders.length} commande${readyOrders.length > 1 ? "s" : ""} prête${readyOrders.length > 1 ? "s" : ""}`,
      description: "En attente de livraison/encaissement",
    })
  }

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return {
          bg: "bg-destructive/10",
          border: "border-destructive/20",
          icon: "text-destructive",
        }
      case "warning":
        return {
          bg: "bg-warning/10",
          border: "border-warning/20",
          icon: "text-warning",
        }
      case "success":
        return {
          bg: "bg-primary/10",
          border: "border-primary/20",
          icon: "text-primary",
        }
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
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune alerte pour le moment
          </p>
        ) : (
          alerts.map((alert) => {
            const styles = getAlertStyles(alert.type)
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${styles.bg} ${styles.border}`}
              >
                <alert.icon className={`h-4 w-4 mt-0.5 ${styles.icon}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.description}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
