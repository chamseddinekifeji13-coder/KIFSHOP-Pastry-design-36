"use client"

import { useState } from "react"
import {
  Users, TrendingUp, TrendingDown, Award, RotateCcw,
  Loader2, Download, BarChart3, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownRight, Medal,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useTenant } from "@/lib/tenant-context"
import { useAgentStats, useClientOrders } from "@/hooks/use-tenant-data"
import { type AgentStats } from "@/lib/clients/actions"
import { useI18n } from "@/lib/i18n/context"
import { exportToCSV, formatAmountForCSV } from "@/lib/csv-export"
import { toast } from "sonner"

export function AgentPerformanceView() {
  const { t } = useI18n()
  const { data: agents = [], isLoading } = useAgentStats()
  const { data: allOrders = [] } = useClientOrders()
  const [isExporting, setIsExporting] = useState(false)

  // Global stats
  const totalConfirmed = allOrders.filter((o) => o.status !== "annule" && o.returnStatus !== "returned").length
  const totalReturned = allOrders.filter((o) => o.returnStatus === "returned").length
  const totalRevenue = allOrders.filter((o) => o.status !== "annule" && o.returnStatus !== "returned")
    .reduce((sum, o) => sum + o.total, 0)
  const globalReturnRate = totalConfirmed > 0 ? Math.round((totalReturned / totalConfirmed) * 100) : 0

  // Best & worst agents
  const bestAgent = agents.length > 0 ? agents.reduce((best, a) => a.totalConfirmed > best.totalConfirmed ? a : best) : null
  const worstReturnRate = agents.length > 0 ? agents.reduce((worst, a) => a.returnRate > worst.returnRate ? a : worst) : null

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
                <p className="text-2xl font-bold">{totalConfirmed}</p>
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
                <p className="text-2xl font-bold">{totalReturned}</p>
                <p className="text-xs text-muted-foreground">Retours ({globalReturnRate}%)</p>
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
                <p className="text-2xl font-bold">{totalRevenue.toFixed(0)}</p>
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
      {(bestAgent || worstReturnRate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestAgent && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <Medal className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Meilleur vendeur</p>
                    <p className="font-bold text-lg">{bestAgent.agentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {bestAgent.totalConfirmed} confirmations | {bestAgent.totalRevenue.toFixed(0)} TND
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          )}
          {worstReturnRate && worstReturnRate.returnRate > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangleIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Plus de retours</p>
                    <p className="font-bold text-lg">{worstReturnRate.agentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {worstReturnRate.totalReturned} retours | Taux: {worstReturnRate.returnRate}%
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
            <Card key={agent.agentId} className="hover:shadow-md transition-shadow">
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
                    <p className="font-semibold">{agent.agentName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {agent.totalConfirmed} confirmations
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RotateCcw className="h-3 w-3 text-red-500" />
                        {agent.totalReturned} retours
                      </span>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-primary">{agent.totalRevenue.toFixed(0)} TND</p>
                    <p className="text-[10px] text-muted-foreground">chiffre d'affaires</p>
                  </div>

                  {/* Rates */}
                  <div className="w-32 hidden md:block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Taux retour</span>
                      <span className={`text-xs font-semibold ${
                        agent.returnRate > 20 ? "text-red-600" :
                        agent.returnRate > 10 ? "text-amber-600" :
                        "text-emerald-600"
                      }`}>
                        {agent.returnRate}%
                      </span>
                    </div>
                    <Progress
                      value={agent.returnRate}
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

// Small helper to avoid naming conflict with lucide-react import
function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  )
}
