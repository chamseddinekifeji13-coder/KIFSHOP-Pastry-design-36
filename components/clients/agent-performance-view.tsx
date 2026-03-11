"use client"

import { useState, useMemo } from "react"
import {
  Users, TrendingUp, TrendingDown, Award, RotateCcw,
  Loader2, Download, BarChart3, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownRight, Medal, AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAgentStats, useClientOrders } from "@/hooks/use-tenant-data"
import { type AgentStats } from "@/lib/clients/actions"
import { exportToCSV, formatAmountForCSV } from "@/lib/csv-export"
import { toast } from "sonner"

export function AgentPerformanceView() {
  const { data: agents = [], isLoading } = useAgentStats()
  const { data: allOrders = [] } = useClientOrders()
  const [isExporting, setIsExporting] = useState(false)

  // Global stats from agents data (includes BD returns)
  const stats = useMemo(() => {
    if (!agents || agents.length === 0) {
      return {
        totalConfirmed: 0,
        totalReturned: 0,
        totalRevenue: 0,
        globalReturnRate: 0,
        activeAgents: 0,
      }
    }
    
    const totalConfirmed = agents.reduce((sum, a) => sum + (a?.totalConfirmed ?? 0), 0)
    const totalReturned = agents.reduce((sum, a) => sum + (a?.totalReturned ?? 0), 0)
    const totalRevenue = agents.reduce((sum, a) => sum + (a?.totalRevenue ?? 0), 0)
    const returnRate = totalConfirmed > 0 ? Math.round((totalReturned / totalConfirmed) * 100) : 0

    return {
      totalConfirmed,
      totalReturned,
      totalRevenue,
      globalReturnRate: returnRate,
      activeAgents: agents.length,
    }
  }, [agents])

  // Best & worst agents with memoization
  const agentComparisons = useMemo(() => {
    if (!agents || agents.length === 0) {
      return { best: null, worst: null }
    }

    const best = agents.reduce((best, a) => (a?.totalConfirmed ?? 0) > (best?.totalConfirmed ?? 0) ? a : best, agents[0])
    const worst = agents.reduce((worst, a) => (a?.returnRate ?? 0) > (worst?.returnRate ?? 0) ? a : worst, agents[0])

    return { best, worst }
  }, [agents])

  const handleExport = () => {
    setIsExporting(true)
    try {
      exportToCSV({
        filename: "performance-agents",
        headers: ["Agent", "Confirmations", "Retours", "CA (TND)", "Taux confirmation", "Taux retour"],
        data: agents.map((a) => [
          a.agentName,
          a.totalConfirmed,
          a.totalReturned,
          formatAmountForCSV(a.totalRevenue),
          `${a.confirmationRate}%`,
          `${a.returnRate}%`,
        ]),
      })
      toast.success("Export CSV termine")
    } catch {
      toast.error("Erreur d'export")
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Vendeurs</h1>
          <p className="text-muted-foreground">
            Suivi des confirmations et retours par agent
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalConfirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                <RotateCcw className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReturned}</p>
                <p className="text-xs text-muted-foreground">Retours ({stats.globalReturnRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">CA Total (TND)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-xs text-muted-foreground">Agents actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {(agentComparisons.best || agentComparisons.worst) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentComparisons.best && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <Medal className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Meilleur vendeur</p>
                    <p className="font-bold text-lg">{agentComparisons.best?.agentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {agentComparisons.best?.totalConfirmed} confirmations | {agentComparisons.best?.totalRevenue.toFixed(0)} TND
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          )}
          {agentComparisons.worst && agentComparisons.worst.returnRate > 0 && agentComparisons.worst.agentId !== agentComparisons.best?.agentId && (
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Plus de retours</p>
                    <p className="font-bold text-lg">{agentComparisons.worst?.agentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {agentComparisons.worst?.totalReturned} retours | Taux: {agentComparisons.worst?.returnRate}%
                    </p>
                  </div>
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Agent Table */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Aucune donnee</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Les stats apparaitront quand des commandes rapides seront creees
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, index) => (
            <Card key={agent?.agentId || `agent-${index}`} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0 ? "bg-amber-100 text-amber-700" :
                    index === 1 ? "bg-gray-200 text-gray-700" :
                    index === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{agent?.agentName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {agent?.totalConfirmed ?? 0} confirmations
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RotateCcw className="h-3 w-3 text-red-500" />
                        {agent?.totalReturned ?? 0} retours
                      </span>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-primary">{(agent?.totalRevenue ?? 0).toFixed(0)} TND</p>
                    <p className="text-[10px] text-muted-foreground">chiffre d'affaires</p>
                  </div>

                  {/* Rates */}
                  <div className="w-32 hidden md:block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Taux retour</span>
                      <span className={`text-xs font-semibold ${
                        (agent?.returnRate ?? 0) > 20 ? "text-red-600" :
                        (agent?.returnRate ?? 0) > 10 ? "text-amber-600" :
                        "text-emerald-600"
                      }`}>
                        {agent?.returnRate ?? 0}%
                      </span>
                    </div>
                    <Progress
                      value={agent?.returnRate ?? 0}
                      className="h-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
