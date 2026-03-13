"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, CreditCard, Clock, AlertTriangle, ArrowUpCircle, MessageSquare, WifiOff, Eye, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getSuperAdminStats,
  getAllTenants,
  updateTenantAppVersion,
  updateAllTenantsAppVersion,
  getCurrentAppVersion,
  type SuperAdminStats,
  type TenantOverview,
} from "@/lib/super-admin/actions"

const PLAN_LABELS: Record<string, string> = {
  trial: "Essai",
  basic: "Basic",
  premium: "Premium",
  free: "Gratuit",
}

const STATUS_LABELS: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  expired: "Expire",
  suspended: "Suspendu",
}

export function SuperAdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [allTenants, setAllTenants] = useState<TenantOverview[]>([])
  const [recentTenants, setRecentTenants] = useState<TenantOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [showOutdated, setShowOutdated] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [appVersion, setAppVersion] = useState("1.2.0")

  async function handleUpdateVersion(tenantId: string) {
    startTransition(async () => {
      try {
        await updateTenantAppVersion(tenantId)
        // Refresh data
        const [statsData, tenantsData] = await Promise.all([getSuperAdminStats(), getAllTenants()])
        setStats(statsData)
        setAllTenants(tenantsData)
        setRecentTenants(tenantsData.slice(0, 5))
      } catch (error) {
        console.error("Error updating version:", error)
      }
    })
  }

  async function handleUpdateAllVersions() {
    startTransition(async () => {
      try {
        await updateAllTenantsAppVersion()
        const [statsData, tenantsData] = await Promise.all([getSuperAdminStats(), getAllTenants()])
        setStats(statsData)
        setAllTenants(tenantsData)
        setRecentTenants(tenantsData.slice(0, 5))
        setShowOutdated(false)
      } catch (error) {
        console.error("Error updating all versions:", error)
      }
    })
  }

  const outdatedTenants = allTenants.filter(
    (t) => t.app_version !== (stats?.currentAppVersion || "1.2.0")
  )

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const inactiveTenants = allTenants.filter(
    (t) => !t.last_login || t.last_login < sevenDaysAgo
  )

  useEffect(() => {
    async function load() {
      try {
        const [statsData, tenantsData, version] = await Promise.all([
          getSuperAdminStats(),
          getAllTenants(),
          getCurrentAppVersion(),
        ])
        setStats(statsData)
        setAllTenants(tenantsData)
        setRecentTenants(tenantsData.slice(0, 5))
        setAppVersion(version)
      } catch (error) {
        console.error("Error loading super admin data:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patisseries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeTenants || 0} actives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              sur tous les tenants
            </p>
          </CardContent>
        </Card>

        <Card
          className={(stats?.inactiveLast7Days || 0) > 0 ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
          onClick={() => (stats?.inactiveLast7Days || 0) > 0 && setShowInactive(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactifs 7j</CardTitle>
            <WifiOff className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.inactiveLast7Days || 0) > 0 ? "text-amber-600" : ""}`}>
              {stats?.inactiveLast7Days || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.inactiveLast7Days || 0) > 0 ? "cliquez pour voir" : "aucun login depuis 7j"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={(stats?.outdatedVersions || 0) > 0 ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
          onClick={() => (stats?.outdatedVersions || 0) > 0 && setShowOutdated(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Version obsolete</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.outdatedVersions || 0) > 0 ? "text-amber-600" : ""}`}>
              {stats?.outdatedVersions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.outdatedVersions || 0) > 0 ? "cliquez pour voir" : `actuelle: v${stats?.currentAppVersion || "1.2.0"}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets ouverts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.totalOpenTickets || 0) > 0 ? "text-destructive" : ""}`}>
              {stats?.totalOpenTickets || 0}
            </div>
            <p className="text-xs text-muted-foreground">support en cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abonnements</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {stats?.statusBreakdown.map((s) => (
                <Badge
                  key={s.status}
                  variant={s.status === "active" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {STATUS_LABELS[s.status] || s.status}: {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patisseries recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune patisserie enregistree
            </p>
          ) : (
            <div className="space-y-3">
              {recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-3 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-background"
                      {...{ style: { backgroundColor: tenant.primary_color } }}
                    >
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.user_count} utilisateur{tenant.user_count !== 1 ? "s" : ""} - Cree le{" "}
                        {new Date(tenant.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0 ml-12 sm:ml-0">
                    <Badge
                      variant={tenant.is_active ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {tenant.is_active ? "Actif" : "Suspendu"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {PLAN_LABELS[tenant.subscription_plan] || tenant.subscription_plan}
                    </Badge>
                    {tenant.subscription_status === "trial" && tenant.trial_ends_at && (
                      <Badge variant="secondary" className="text-[10px]">
                        Essai: {new Date(tenant.trial_ends_at).toLocaleDateString("fr-FR")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Versions obsoletes */}
      <Dialog open={showOutdated} onOpenChange={setShowOutdated}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-amber-500" />
              Tenants avec version obsolete
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Version actuelle : <strong>v{stats?.currentAppVersion || "1.2.0"}</strong>
            </p>
            {outdatedTenants.length > 1 && (
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1.5 text-xs"
                disabled={isPending}
                onClick={handleUpdateAllVersions}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                Tout mettre a jour
              </Button>
            )}
          </div>
          {outdatedTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Tous les tenants sont a jour.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {outdatedTenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-background"
                      {...{ style: { backgroundColor: t.primary_color } }}
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                          v{t.app_version}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">vers v{appVersion}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => handleUpdateVersion(t.id)}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                      Mettre a jour
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => { setShowOutdated(false); router.push(`/super-admin/tenants/${t.id}`) }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Inactifs 7 jours */}
      <Dialog open={showInactive} onOpenChange={setShowInactive}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-amber-500" />
              Tenants inactifs depuis 7 jours
            </DialogTitle>
          </DialogHeader>
          {inactiveTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Tous les tenants sont actifs.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {inactiveTenants.map((t) => {
                const lastLogin = t.last_login ? new Date(t.last_login) : null
                const daysSince = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : null
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-background"
                        {...{ style: { backgroundColor: t.primary_color } }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-amber-600">
                          {lastLogin ? `Dernier login: il y a ${daysSince}j` : "Jamais connecte"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => { setShowInactive(false); router.push(`/super-admin/tenants/${t.id}`) }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
