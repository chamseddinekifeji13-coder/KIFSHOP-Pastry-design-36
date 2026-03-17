"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

interface SyncLog {
  id: number
  sync_type: string
  status: string
  transactions_count: number
  transactions_created: number
  transactions_updated: number
  stock_updated: number
  error_message?: string
  started_at: string
  ended_at?: string
  duration_ms?: number
}

interface SyncStatus {
  lastSync?: SyncLog
  nextSync?: string
  isRunning: boolean
  error?: string
}

export function POS80SyncDashboard({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<SyncStatus>({ isRunning: false })
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load status and logs
  useEffect(() => {
    if (tenantId) {
      loadStatus()
      const interval = setInterval(() => loadStatus(), 10000) // Poll every 10s
      return () => clearInterval(interval)
    }
  }, [tenantId])

  const loadStatus = useCallback(async () => {
    if (!tenantId) return
    
    try {
      setError(null)
      const [statusRes, logsRes] = await Promise.all([
        fetch(`/api/pos80/sync/status?tenantId=${tenantId}`),
        fetch(`/api/pos80/sync/logs?tenantId=${tenantId}`),
      ])

      if (!statusRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const statusData = await statusRes.json()
      const logsData = await logsRes.json()

      setStatus(statusData || { isRunning: false })
      setLogs(Array.isArray(logsData) ? logsData : [])
    } catch (err) {
      console.error('[v0] Failed to load sync status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      const res = await fetch('/api/pos80/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Sync failed')
      }
      
      const result = await res.json()
      toast.success(`Synchronisation lancée: ${result.data?.transactions_count || 0} transactions`)
      await loadStatus()
    } catch (err) {
      console.error('[v0] Sync failed:', err)
      const msg = err instanceof Error ? err.message : 'Erreur lors de la synchronisation'
      setError(msg)
      toast.error(msg)
    } finally {
      setSyncing(false)
    }
  }

  const exportLogs = () => {
    try {
      const csv = [
        ['Date', 'Type', 'Statut', 'Transactions', 'Créées', 'Mises à jour', 'Stock', 'Durée (ms)'],
        ...logs.map(log => [
          new Date(log.started_at).toLocaleString('fr-FR'),
          log.sync_type,
          log.status,
          log.transactions_count,
          log.transactions_created,
          log.transactions_updated,
          log.stock_updated,
          log.duration_ms || '-',
        ]),
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pos80-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[v0] Export failed:', err)
      toast.error('Erreur lors de l\'export')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statut de Synchronisation</CardTitle>
          <CardDescription>État actuel et historique de synchronisation POS80</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Alert */}
          {status.isRunning && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Synchronisation en cours...</AlertDescription>
            </Alert>
          )}

          {status.error && !error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          {/* Last Sync Info */}
          {status.lastSync && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dernière synchronisation</span>
                  <Badge variant={status.lastSync.status === 'success' ? 'default' : 'destructive'}>
                    {status.lastSync.status === 'success' ? 'Succès' : 'Erreur'}
                  </Badge>
                </div>
                <p className="text-sm font-medium">
                  {new Date(status.lastSync.started_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Durée: {status.lastSync.duration_ms}ms
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Statistiques</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transactions</p>
                    <p className="font-medium">{status.lastSync.transactions_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Créées</p>
                    <p className="font-medium">{status.lastSync.transactions_created}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mises à jour</p>
                    <p className="font-medium">{status.lastSync.transactions_updated}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stock</p>
                    <p className="font-medium">{status.lastSync.stock_updated}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleManualSync}
              disabled={syncing || status.isRunning}
              className="flex-1"
            >
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Synchroniser maintenant
            </Button>
            <Button
              onClick={exportLogs}
              disabled={logs.length === 0}
              variant="outline"
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique (30 derniers syncs)</CardTitle>
          <CardDescription>Détail de chaque synchronisation</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune synchronisation encore</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Créées</TableHead>
                    <TableHead className="text-right">Mises à jour</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.started_at).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.sync_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Succès</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Erreur</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {log.transactions_count}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {log.transactions_created}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {log.transactions_updated}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {log.duration_ms}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/pos80/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (!res.ok) throw new Error('Sync failed')
      
      const result = await res.json()
      toast.success(`Synchronisation lancée: ${result.transactions_count} transactions`)
      await loadStatus()
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const exportLogs = () => {
    const csv = [
      ['Date', 'Type', 'Statut', 'Transactions', 'Créées', 'Mises à jour', 'Stock', 'Durée (ms)'],
      ...logs.map(log => [
        new Date(log.started_at).toLocaleString('fr-FR'),
        log.sync_type,
        log.status,
        log.transactions_count,
        log.transactions_created,
        log.transactions_updated,
        log.stock_updated,
        log.duration_ms || '-',
      ]),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pos80-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statut de Synchronisation</CardTitle>
          <CardDescription>État actuel et historique de synchronisation POS80</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Alert */}
          {status.isRunning && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Synchronisation en cours...</AlertDescription>
            </Alert>
          )}

          {status.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          {/* Last Sync Info */}
          {status.lastSync && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dernière synchronisation</span>
                  <Badge variant={status.lastSync.status === 'success' ? 'default' : 'destructive'}>
                    {status.lastSync.status === 'success' ? 'Succès' : 'Erreur'}
                  </Badge>
                </div>
                <p className="text-sm font-medium">
                  {new Date(status.lastSync.started_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Durée: {status.lastSync.duration_ms}ms
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Statistiques</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transactions</p>
                    <p className="font-medium">{status.lastSync.transactions_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Créées</p>
                    <p className="font-medium">{status.lastSync.transactions_created}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mises à jour</p>
                    <p className="font-medium">{status.lastSync.transactions_updated}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stock</p>
                    <p className="font-medium">{status.lastSync.stock_updated}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleManualSync}
              disabled={syncing || status.isRunning}
              className="flex-1"
            >
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Synchroniser maintenant
            </Button>
            <Button
              onClick={exportLogs}
              disabled={logs.length === 0}
              variant="outline"
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique (30 derniers syncs)</CardTitle>
          <CardDescription>Détail de chaque synchronisation</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune synchronisation encore</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Créées</TableHead>
                    <TableHead className="text-right">Mises à jour</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.started_at).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.sync_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Succès</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Erreur</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {log.transactions_count}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {log.transactions_created}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {log.transactions_updated}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {log.duration_ms}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
