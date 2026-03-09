"use client"

import { useState } from "react"
import { KPICards } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { AlertsPanel } from "./alerts-panel"
import { OnlineSalesWidget } from "./online-sales-widget"
import { BestDeliveryReport } from "./best-delivery-report"
import { useI18n } from "@/lib/i18n/context"
import { useTenant } from "@/lib/tenant-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Truck } from "lucide-react"

export function DashboardView() {
  const { t } = useI18n()
  const { currentRole } = useTenant()
  const [activeTab, setActiveTab] = useState("overview")
  
  // Only owner and gerant can access Best Delivery
  const canAccessDelivery = currentRole === "owner" || currentRole === "gerant"

  // Contenu réutilisable extrait pour éviter la duplication
  const OverviewContent = () => (
    <>
      <KPICards />
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart />
        <div className="space-y-6">
          <AlertsPanel />
          <OnlineSalesWidget />
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>
      </div>

      {canAccessDelivery ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.overviewTab") || "Vue générale"}
            </TabsTrigger>
            <TabsTrigger value="best-delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.bestDeliveryTab") || "Best Delivery"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewContent />
          </TabsContent>

          <TabsContent value="best-delivery">
            <BestDeliveryReport />
          </TabsContent>
        </Tabs>
      ) : (
        <OverviewContent />
      )}
    </div>
  )
}
