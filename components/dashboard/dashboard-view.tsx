"use client"

import { KPICards } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { AlertsPanel } from "./alerts-panel"
import { QuickActions } from "./quick-actions"
import { OnlineSalesWidget } from "./online-sales-widget"
import { useI18n } from "@/lib/i18n/context"

export function DashboardView() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <KPICards />

      {/* Quick Actions - prominent at top */}
      <QuickActions />

      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart />
        <div className="space-y-6">
          <AlertsPanel />
          <OnlineSalesWidget />
        </div>
      </div>
    </div>
  )
}
