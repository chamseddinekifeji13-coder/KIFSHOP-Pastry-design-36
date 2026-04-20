"use client"

import { useTenant } from "@/lib/tenant-context"
import { POS80SyncDashboard } from "@/components/treasury/pos80-sync-dashboard"
import { Loader2 } from "lucide-react"

export default function POS80SyncPage() {
  const { currentTenant, isLoading } = useTenant()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (currentTenant.id === "__fallback__") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Synchronisation POS80</h1>
          <p className="text-muted-foreground">
            Erreur: Impossible de charger les informations du locataire
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Synchronisation POS80</h1>
        <p className="text-muted-foreground">
          Suivez l'état de synchronisation de vos transactions POS80
        </p>
      </div>

      <POS80SyncDashboard tenantId={currentTenant.id} />
    </div>
  )
}
