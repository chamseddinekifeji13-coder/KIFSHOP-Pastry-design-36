"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Clock, Banknote } from "lucide-react"
import { getUnverifiedCourierCollections, approveCourierCollection, getCourierCollectionsSummary } from "@/lib/orders/actions"
import { useTenant } from "@/lib/tenant-context"

interface CourierCollection {
  id: string
  orderId: string
  tenantId: string
  amount: number
  paymentMethod: string
  collectorName: string
  collectedAt: string
  recordedByName?: string
  verified: boolean
  verifiedAt?: string
  verifiedByName?: string
  reference?: string
  notes?: string
}

export function CourierCollectionsPanel() {
  const tenantId = useTenant()
  const [unverified, setUnverified] = useState<CourierCollection[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())

  const loadData = async () => {
    setLoading(true)
    const [collections, summaryData] = await Promise.all([
      getUnverifiedCourierCollections(tenantId),
      getCourierCollectionsSummary(tenantId),
    ])
    setUnverified(collections)
    setSummary(summaryData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // Rafraîchir toutes les 10s
    return () => clearInterval(interval)
  }, [tenantId])

  const handleApprove = async (id: string) => {
    setApprovingIds((prev) => new Set([...prev, id]))
    const success = await approveCourierCollection(id, tenantId)
    if (success) {
      setUnverified((prev) => prev.filter((c) => c.id !== id))
      await loadData()
    }
    setApprovingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encaissements par livreur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: "Espèces",
    card: "Carte",
    bank_transfer: "Virement",
    check: "Chèque",
    cod_courier: "Contre-remboursement",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Encaissements par livreur</CardTitle>
            <CardDescription>Validation des montants reçus des livreurs</CardDescription>
          </div>
          {unverified.length > 0 && (
            <Badge variant="destructive" className="h-fit">
              {unverified.length} en attente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Résumé global */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-destructive/5 p-4 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Non vérifiés</span>
              </div>
              <div className="text-2xl font-bold text-destructive">
                {summary.unverifiedTotal.toLocaleString("fr-TN")} TND
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.unverifiedCount} encaissement(s)
              </p>
            </div>

            <div className="rounded-lg bg-green-500/5 p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Vérifiés</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {summary.verifiedTotal.toLocaleString("fr-TN")} TND
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.verifiedCount} encaissement(s)
              </p>
            </div>
          </div>
        )}

        {/* Liste des encaissements non vérifiés */}
        {unverified.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">En attente de validation</h3>
            {unverified.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">
                      {collection.amount.toLocaleString("fr-TN")} TND
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {paymentMethodLabels[collection.paymentMethod] || collection.paymentMethod}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Livreur: {collection.collectorName}</p>
                    <p>Commande: {collection.orderId}</p>
                    <p>Reçu le: {new Date(collection.collectedAt).toLocaleString("fr-TN")}</p>
                    {collection.notes && <p>Notes: {collection.notes}</p>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleApprove(collection.id)}
                  disabled={approvingIds.has(collection.id)}
                  className="ml-4"
                >
                  {approvingIds.has(collection.id) ? "En cours..." : "Approuver"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Tous les encaissements ont été vérifiés ✓</p>
          </div>
        )}

        {/* Résumé par livreur */}
        {summary?.byCourier && Object.keys(summary.byCourier).length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Résumé par livreur</h3>
            <div className="space-y-2">
              {Object.entries(summary.byCourier).map(([courier, stats]: [string, any]) => (
                <div key={courier} className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="font-medium mb-2">{courier}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Non vérifiés:</span>
                      <p className="font-semibold text-destructive">
                        {stats.unverifiedCount} × {stats.unverifiedTotal.toLocaleString("fr-TN")} TND
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vérifiés:</span>
                      <p className="font-semibold text-green-600">
                        {stats.verifiedCount} × {stats.verifiedTotal.toLocaleString("fr-TN")} TND
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
