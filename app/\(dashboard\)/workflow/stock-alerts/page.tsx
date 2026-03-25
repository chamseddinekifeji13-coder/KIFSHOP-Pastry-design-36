'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StockAlertsPanel } from '@/components/workflow/stock-alerts-panel'
import { useStockAlertsWorkflow } from '@/hooks/use-stock-alerts-workflow'
import { useToast } from '@/components/ui/use-toast'

export default function StockAlertsPage() {
  const { toast } = useToast()
  const { alerts, stats, loading, error, refetch } = useStockAlertsWorkflow()
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erreur',
        description: error,
        variant: 'destructive',
      })
    }
  }, [error, toast])

  const handleRefresh = async () => {
    const success = await refetch()
    if (success) {
      toast({
        title: 'Succès',
        description: 'Alertes mises à jour',
      })
    }
  }

  const handleConvertAll = async () => {
    setConverting(true)
    try {
      // Call API to convert all alerts to procurement orders
      const response = await fetch('/api/workflow/convert-alerts-to-orders', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Erreur lors de la conversion')
      
      toast({
        title: 'Succès',
        description: `${alerts.length} alertes converties en bons d'approvisionnement`,
      })
      await refetch()
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur lors de la conversion',
        variant: 'destructive',
      })
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              Alertes Stock
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les articles en rupture ou à faible stock
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </Button>
            <Button
              onClick={handleConvertAll}
              disabled={converting || alerts.length === 0 || loading}
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer bons ({alerts.length})
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rupture Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.critical || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Articles urgents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Faible</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats?.warning || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">À surveiller</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Alertes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{alerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">À traiter</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucune alerte</h3>
              <p className="text-muted-foreground">Tous vos stocks sont à jour!</p>
            </CardContent>
          </Card>
        ) : (
          <StockAlertsPanel alerts={alerts} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  )
}
