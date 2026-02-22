"use client"

import { useEffect, useState } from "react"
import { Building2, Users, CreditCard, Clock, AlertTriangle, ArrowUpCircle, MessageSquare, WifiOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getSuperAdminStats,
  getAllTenants,
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
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [recentTenants, setRecentTenants] = useState<TenantOverview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsData, tenantsData] = await Promise.all([
          getSuperAdminStats(),
          getAllTenants(),
        ])
        setStats(statsData)
        setRecentTenants(tenantsData.slice(0, 5))
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactifs 7j</CardTitle>
            <WifiOff className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.inactiveLast7Days || 0) > 0 ? "text-amber-600" : ""}`}>
              {stats?.inactiveLast7Days || 0}
            </div>
            <p className="text-xs text-muted-foreground">aucun login depuis 7j</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Version obsolete</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.outdatedVersions || 0) > 0 ? "text-amber-600" : ""}`}>
              {stats?.outdatedVersions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              actuelle: v{stats?.currentAppVersion || "1.2.0"}
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
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-background"
                      style={{ backgroundColor: tenant.primary_color }}
                    >
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.user_count} utilisateur{tenant.user_count !== 1 ? "s" : ""} - Cree le{" "}
                        {new Date(tenant.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
    </div>
  )
}
