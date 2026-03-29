'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { convertAlertToApprovisionnement } from '@/lib/workflow/actions'
import { fetchCriticalStockAlerts } from '@/lib/stocks/notifications'

interface StockAlertItem {
  id: string
  itemName: string
  itemUnit: string
  currentStock: number
  minStock: number
  suggestedQuantity: number
  severity: 'critical' | 'warning' | 'info'
  preferredSupplier?: string
}

interface StockManagerDashboardProps {
  tenantId: string
}

export function StockManagerDashboard({ tenantId }: StockManagerDashboardProps) {
  const [alerts, setAlerts] = useState<StockAlertItem[]>([])
  const [converting, setConverting] = useState<string | null>(null)
  const [convertedItems, setConvertedItems] = useState<Set<string>>(new Set())

  // Récupérer les alertes stock
  const { data: alertsData, isLoading, error } = useSWR(
    `/api/stock-alerts?tenantId=${tenantId}`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch alerts')
      return res.json()
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  useEffect(() => {
    if (alertsData?.alerts) {
      setAlerts(alertsData.alerts)
    }
  }, [alertsData])

  const handleConvertToApprovisionnement = async (alertId: string) => {
    setConverting(alertId)
    try {
      const result = await convertAlertToApprovisionnement(alertId, tenantId)
      if (result) {
        setConvertedItems(prev => new Set(prev).add(alertId))
        // Rafraîchir la liste après un court délai
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      console.error('Error converting alert:', err)
      alert('Erreur lors de la conversion')
    } finally {
      setConverting(null)
    }
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critique</Badge>
      case 'warning':
        return <Badge variant="secondary">Attention</Badge>
      default:
        return <Badge variant="outline">Info</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Alertes Critiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-gray-500 mt-1">Nécessitent attention immédiate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avertissements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
            <p className="text-xs text-gray-500 mt-1">À surveiller</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Alertes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{alerts.length}</div>
            <p className="text-xs text-gray-500 mt-1">Alertes actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des alertes */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes Stock en Attente</CardTitle>
          <CardDescription>Convertissez les alertes critiques en bons d'approvisionnement</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement des alertes...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Erreur lors du chargement des alertes</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune alerte stock</div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{alert.itemName}</h4>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Stock actuel: <span className="font-semibold">{alert.currentStock}</span> {alert.itemUnit}
                        {' '} ({alert.minStock} min)
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantité suggérée: <span className="font-semibold">{alert.suggestedQuantity}</span> {alert.itemUnit}
                      </p>
                      {alert.preferredSupplier && (
                        <p className="text-sm text-blue-600 mt-1">
                          Fournisseur préféré: {alert.preferredSupplier}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleConvertToApprovisionnement(alert.id)}
                    disabled={converting === alert.id || convertedItems.has(alert.id)}
                    size="sm"
                    className="ml-4"
                  >
                    {converting === alert.id ? (
                      'Conversion...'
                    ) : convertedItems.has(alert.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Converti
                      </>
                    ) : (
                      'Créer Bon Appro'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
