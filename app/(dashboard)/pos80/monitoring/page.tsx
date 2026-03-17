'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { getActiveProfile } from '@/lib/active-profile'
import { getPOS80SyncLogs } from '@/lib/pos80/actions'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface SyncLog {
  id: number
  tenant_id: string
  sync_type: string
  status: string
  transactions_count: number
  transactions_created: number
  transactions_updated: number
  stock_updated: number
  revenue_created: number
  error_message: string | null
  started_at: string
  ended_at: string
  duration_ms: number
  triggered_by: string | null
  pos80_response_time_ms: number
  created_at: string
}

export default function POS80MonitoringPage() {
  const [profile, setProfile] = useState<any>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalTransactions: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const p = await getActiveProfile()
      if (p) {
        setProfile(p)
        const syncLogs = await getPOS80SyncLogs(p.tenantId, 50, 30)
        setLogs(syncLogs as SyncLog[])

        // Calculate stats
        const successful = syncLogs.filter((log: any) => log.status === 'success').length
        const failed = syncLogs.filter((log: any) => log.status === 'failed').length
        const totalTx = syncLogs.reduce((sum: number, log: any) => sum + (log.transactions_count || 0), 0)
        const totalRev = syncLogs.reduce((sum: number, log: any) => sum + (log.revenue_created || 0), 0)

        setStats({
          totalSyncs: syncLogs.length,
          successfulSyncs: successful,
          failedSyncs: failed,
          totalTransactions: totalTx,
          totalRevenue: totalRev,
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const response = await fetch('/api/pos80/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'manual' }),
      })

      if (response.ok) {
        toast.success('Synchronisation en cours...')
        // Reload after a delay to let the sync complete
        setTimeout(() => {
          loadData()
        }, 2000)
      } else {
        toast.error('Erreur lors de la synchronisation')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const successRate = stats.totalSyncs > 0 ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring POS80</h1>
          <p className="text-muted-foreground mt-2">
            Suivi de l'état de synchronisation et des transactions importées
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} size="lg">
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Synchronisation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser maintenant
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSyncs}</div>
            <p className="text-xs text-muted-foreground">Derniers 30 jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de succès</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.successfulSyncs} réussies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Synchronisées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} TND</div>
            <p className="text-xs text-muted-foreground">Total importé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Erreurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedSyncs}</div>
            <p className="text-xs text-muted-foreground">Synchronisations</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Syncs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des synchronisations</CardTitle>
          <CardDescription>Les 30 dernières tentatives de synchronisation</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Aucune synchronisation enregistrée. Configurez POS80 pour commencer.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Revenu</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                    <TableHead className="text-right">API</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.sync_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Succès</span>
                          </div>
                        ) : log.status === 'failed' ? (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm">Erreur</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm">En cours</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.transactions_count} ({log.transactions_created} new)
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {log.revenue_created.toFixed(2)} TND
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {log.duration_ms}ms
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {log.pos80_response_time_ms}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Log */}
      {logs.some((log) => log.error_message) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg text-red-900">Erreurs récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs
                .filter((log) => log.error_message)
                .map((log) => (
                  <div key={log.id} className="text-sm p-3 bg-white rounded border border-red-200">
                    <div className="font-medium text-red-900">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                    </div>
                    <div className="text-red-700 mt-1">{log.error_message}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
