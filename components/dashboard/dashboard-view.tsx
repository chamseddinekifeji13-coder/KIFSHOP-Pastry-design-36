"use client"

import { KPICards } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { AlertsPanel } from "./alerts-panel"
import { QuickActions } from "./quick-actions"
import { OnlineSalesWidget } from "./online-sales-widget"

export function DashboardView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d{"'"}ensemble de votre activité
        </p>
      </div>

      <KPICards />

      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart />
        <div className="space-y-6">
          <AlertsPanel />
          <OnlineSalesWidget />
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
