"use client"

import { useContext } from "react"
import { TenantContext } from "@/lib/tenant-context"
import { ProcurementOrdersManagement } from "@/components/workflow/procurement-orders-management"
import { AuditTimeline } from "@/components/workflow/audit-timeline"
import { 
  validateBonApprovisionnement,
  createPurchaseOrdersFromBonApprov,
  cancelBonApprovisionnement
} from "@/lib/workflow/actions"
import { notifyBonApprovValidated, notifyPurchaseOrdersCreated } from "@/lib/workflow/notifications"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function ProcurementOrdersPage() {
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

  const handleValidate = async (bonId: string) => {
    try {
      const result = await validateBonApprovisionnement(bonId, tenantId)
      
      if (result) {
        await notifyBonApprovValidated(tenantId, [userId], result.reference, bonId)
        
        toast({
          title: "Succès",
          description: `Bon d'approvisionnement validé`,
        })
      }
    } catch (error) {
      console.error("Error validating bon:", error)
      throw error
    }
  }

  const handleSend = async (bonId: string) => {
    try {
      const result = await createPurchaseOrdersFromBonApprov(bonId, tenantId, userId)
      
      if (result) {
        toast({
          title: "Succès",
          description: `${result.purchaseOrderCount} commande(s) créée(s) auprès de ${result.supplierCount} fournisseur(s)`,
        })
      }
    } catch (error) {
      console.error("Error sending orders:", error)
      throw error
    }
  }

  const handleCancel = async (bonId: string) => {
    try {
      const result = await cancelBonApprovisionnement(bonId, tenantId)
      
      if (result) {
        toast({
          title: "Succès",
          description: "Bon d'approvisionnement annulé",
        })
      }
    } catch (error) {
      console.error("Error cancelling bon:", error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bons d'Approvisionnement</h1>
        <p className="text-muted-foreground mt-2">
          Gestion des bons et création des commandes fournisseurs
        </p>
      </div>

      <ProcurementOrdersManagement 
        tenantId={tenantId}
        onValidate={handleValidate}
        onSend={handleSend}
        onCancel={handleCancel}
      />

      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Historique des Actions</h2>
        <AuditTimeline 
          tenantId={tenantId}
          entityType="bon_approvisionnement"
        />
      </div>
    </div>
  )
}
