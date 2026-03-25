"use client"

import { useContext } from "react"
import { TenantContext } from "@/lib/tenant-context"
import { StockAlertsPanel } from "@/components/workflow/stock-alerts-panel"
import { AuditTimeline } from "@/components/workflow/audit-timeline"
import { convertAlertToApprovisionnement } from "@/lib/workflow/actions"
import { notifyBonApprovCreated } from "@/lib/workflow/notifications"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function StockAlertsPage() {
  const context = useContext(TenantContext)
  const { toast } = useToast()

  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Impossible de charger le contexte tenant</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { tenantId, userId } = context

  const handleConvertAlert = async (alertId: string) => {
    try {
      const result = await convertAlertToApprovisionnement(alertId, tenantId, "normal")
      
      if (result) {
        await notifyBonApprovCreated(
          tenantId,
          userId,
          result.reference,
          result.id,
          result.totalItems,
          result.estimatedTotal
        )
        
        toast({
          title: "Succès",
          description: `Bon d'approvisionnement ${result.reference} créé avec succès`,
        })
      }
    } catch (error) {
      console.error("Error converting alert:", error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alertes Stock</h1>
        <p className="text-muted-foreground mt-2">
          Gestion des seuils minimums et création de bons d'approvisionnement
        </p>
      </div>

      <StockAlertsPanel 
        tenantId={tenantId}
        onConvertAlert={handleConvertAlert}
      />

      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Historique des Actions</h2>
        <AuditTimeline 
          tenantId={tenantId}
          entityType="stock_alert"
        />
      </div>
    </div>
  )
}
