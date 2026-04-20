"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  TrendingUp,
  FileText,
  Bell,
  AlertCircle,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  BarChart3,
  PieChart,
  Loader2,
  RefreshCw
} from "lucide-react"
import { fetchCrmStats, fetchReminders, updateReminderStatus } from "@/lib/super-admin/crm-actions"
import { CrmStats, CrmReminder, REMINDER_PRIORITY_COLORS, REMINDER_TYPE_LABELS, REMINDER_PRIORITY_LABELS } from "@/lib/super-admin/crm-types"
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/super-admin/prospect-types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) + " TND"
}

export function CrmDashboard() {
  const [stats, setStats] = useState<CrmStats | null>(null)
  const [reminders, setReminders] = useState<CrmReminder[]>([])
  const [overdueReminders, setOverdueReminders] = useState<CrmReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, upcomingReminders, overdueData] = await Promise.all([
        fetchCrmStats(),
        fetchReminders({ upcoming: true }),
        fetchReminders({ overdue: true })
      ])
      setStats(statsData)
      setReminders(upcomingReminders.slice(0, 5))
      setOverdueReminders(overdueData)
    } catch (error) {
      console.error("Error loading CRM data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCompleteReminder = async (id: string) => {
    const success = await updateReminderStatus(id, "completed")
    if (success) {
      toast.success("Rappel marque comme termine")
      loadData()
    } else {
      toast.error("Erreur lors de la mise a jour")
    }
  }

  const handleSnoozeReminder = async (id: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const success = await updateReminderStatus(id, "snoozed", tomorrow.toISOString())
    if (success) {
      toast.success("Rappel reporte a demain")
      loadData()
    } else {
      toast.error("Erreur lors de la mise a jour")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Erreur lors du chargement des donnees CRM
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Commercial</h1>
          <p className="text-sm text-muted-foreground">Tableau de bord de la prospection KIFSHOP</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Alert for overdue reminders */}
      {overdueReminders.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-900">
                  {overdueReminders.length} rappel{overdueReminders.length > 1 ? "s" : ""} en retard
                </p>
                <p className="text-sm text-red-700">
                  Vous avez des actions commerciales en attente
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Voir les rappels
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prospects</p>
                <p className="text-xl font-bold">{stats.totalProspects}</p>
                <p className="text-xs text-muted-foreground">{stats.activeProspects} actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-xl font-bold">{stats.conversionRate}%</p>
                <p className="text-xs text-emerald-600">+{stats.convertedThisMonth} ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline</p>
                <p className="text-xl font-bold">{formatCurrency(stats.pipelineValue)}</p>
                <p className="text-xs text-muted-foreground">valeur estimee</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Devis</p>
                <p className="text-xl font-bold">{stats.totalQuotes}</p>
                <p className="text-xs text-muted-foreground">{stats.quoteAcceptanceRate}% acceptes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CA Genere</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">moy. {formatCurrency(stats.avgDealSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rappels</p>
                <p className="text-xl font-bold">{stats.pendingReminders}</p>
                <p className="text-xs text-red-600">{stats.overdueReminders} en retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pipeline Commercial
            </CardTitle>
            <CardDescription>Repartition des prospects par etape</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.prospectsByStage.filter(s => !["converti", "perdu"].includes(s.stage)).map((stage) => {
                const percentage = stats.totalProspects > 0 
                  ? Math.round((stage.count / stats.totalProspects) * 100) 
                  : 0
                return (
                  <div key={stage.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[stage.stage as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-700"}>
                          {STATUS_LABELS[stage.stage as keyof typeof STATUS_LABELS] || stage.stage}
                        </Badge>
                        <span className="font-medium">{stage.count}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
            
            {/* Won/Lost Summary */}
            <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">Convertis</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {stats.prospectsByStage.find(s => s.stage === "converti")?.count || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">Perdus</p>
                  <p className="text-lg font-bold text-red-700">
                    {stats.prospectsByStage.find(s => s.stage === "perdu")?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Prochains rappels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun rappel programme
              </p>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                      REMINDER_PRIORITY_COLORS[reminder.priority]
                    )}>
                      {reminder.reminderType === "call" ? <Phone className="h-4 w-4" /> :
                       reminder.reminderType === "email" ? <Mail className="h-4 w-4" /> :
                       reminder.reminderType === "meeting" ? <Users className="h-4 w-4" /> :
                       <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{reminder.title}</p>
                      {reminder.prospectName && (
                        <p className="text-xs text-muted-foreground truncate">{reminder.prospectName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(reminder.reminderDate).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleCompleteReminder(reminder.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => handleSnoozeReminder(reminder.id)}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Sources des prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topSources.map((source, idx) => (
                <div key={source.source} className="flex items-center gap-3">
                  <div className="w-6 text-center text-sm font-medium text-muted-foreground">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{source.source.replace("_", " ")}</span>
                      <span className="text-sm text-muted-foreground">{source.count} prospects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={stats.totalProspects > 0 ? (source.count / stats.totalProspects) * 100 : 0} 
                        className="h-2 flex-1" 
                      />
                      <span className="text-xs text-emerald-600 w-16 text-right">
                        {source.converted} convertis
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activite recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune activite recente
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      {activity.activityType.includes("interaction") ? <MessageSquare className="h-4 w-4 text-muted-foreground" /> :
                       activity.activityType.includes("quote") ? <FileText className="h-4 w-4 text-muted-foreground" /> :
                       activity.activityType.includes("status") ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> :
                       <Activity className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendance mensuelle
          </CardTitle>
          <CardDescription>Evolution sur les 6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {stats.monthlyTrend.map((month) => (
              <div key={month.month} className="text-center">
                <p className="text-xs text-muted-foreground mb-2">{month.month}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-medium">{month.prospects}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-sm font-medium">{month.converted}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(month.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              Nouveaux prospects
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Convertis
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
