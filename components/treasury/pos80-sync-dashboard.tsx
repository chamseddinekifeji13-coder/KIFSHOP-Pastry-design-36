"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  duration_ms?: number
}

interface SyncStatus {
  lastSync?: SyncLog
  isRunning: boolean
  error?: string
}

export function POS80SyncDashboard({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<SyncStatus>({ isRunning: false })
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!tenantId) return
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch(`/api/pos80/sync/status?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" }),
        fetch(`/api/pos80/sync/logs?tenantId=${encodeURIComponent(tenantId)}&limit=30`, { cache: "no-store" }),
      ])
      if (!statusRes.ok || !logsRes.ok) throw new Error("Chargement impossible")
      const statusData = await statusRes.json()
      const logsData = await logsRes.json()
      setStatus(statusData || { isRunning: false })
      setLogs(Array.isArray(logsData) ? logsData : [])
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur de chargement"
      setStatus((prev) => ({ ...prev, error: msg }))
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [tenantId, loadStatus])

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch("/api/pos80/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })
      if (!res.ok) throw new Error("Synchronisation echouee")
      const result = await res.json()
      toast.success(`Synchronisation lancee: ${result?.data?.transactions_count ?? 0} transactions`)
      await loadStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur de synchronisation")
    } finally {
      setSyncing(false)
    }
  }

  const exportLogs = () => {
    const csv = [
      ["Date", "Type", "Statut", "Transactions", "Creees", "Mises a jour", "Stock", "Duree (ms)"],
      ...logs.map((log) => [
        new Date(log.started_at).toLocaleString("fr-FR"),
        log.sync_type,
        log.status,
        String(log.transactions_count),
        String(log.transactions_created),
        String(log.transactions_updated),
        String(log.stock_updated),
        String(log.duration_ms ?? 0),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pos80-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statut de synchronisation</CardTitle>
          <CardDescription>Etat actuel et historique POS80</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="flex gap-2">
            <Button onClick={handleManualSync} disabled={syncing || status.isRunning} className="flex-1">
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Synchroniser maintenant
            </Button>
            <Button onClick={exportLogs} disabled={logs.length === 0} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique (30 derniers syncs)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
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
                    <TableHead className="text-right">Creees</TableHead>
                    <TableHead className="text-right">Mises a jour</TableHead>
                    <TableHead className="text-right">Duree</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.started_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.sync_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Succes</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Erreur</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{log.transactions_count}</TableCell>
                      <TableCell className="text-right">{log.transactions_created}</TableCell>
                      <TableCell className="text-right">{log.transactions_updated}</TableCell>
                      <TableCell className="text-right">{log.duration_ms ?? 0}ms</TableCell>
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
