"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Receipt,
  Search,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAllTenants,
  getAllPayments,
  type TenantOverview,
  type PaymentRecord,
} from "@/lib/super-admin/actions"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock }> = {
  trial: { label: "Essai", variant: "secondary", icon: Clock },
  active: { label: "Actif", variant: "default", icon: CheckCircle2 },
  expired: { label: "Expire", variant: "destructive", icon: AlertTriangle },
  suspended: { label: "Suspendu", variant: "destructive", icon: AlertTriangle },
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Essai",
  basic: "Basic",
  premium: "Premium",
}

export function SubscriptionsOverview() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantOverview[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    async function load() {
      try {
        const [tenantsData, paymentsData] = await Promise.all([
          getAllTenants(),
          getAllPayments(),
        ])
        setTenants(tenantsData)
        setPayments(paymentsData)
      } catch (error) {
        console.error("Error loading data:", error)
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

  const trialCount = tenants.filter((t) => t.subscription_status === "trial").length
  const activeCount = tenants.filter((t) => t.subscription_status === "active").length
  const suspendedCount = tenants.filter((t) => t.subscription_status === "suspended").length
  const expiredCount = tenants.filter((t) => t.subscription_status === "expired").length

  const filteredTenants = tenants.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || t.subscription_status === filter
    return matchSearch && matchFilter
  })

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => setFilter("all")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => setFilter("trial")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En essai</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => setFilter("active")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => setFilter("suspended")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspendus</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspendedCount + expiredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total paiements</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue} TND</div>
            <p className="text-xs text-muted-foreground">{payments.length} paiements</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Abonnements</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        {/* Tenants/Subscriptions Tab */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  {filter === "all" ? "Tous les abonnements" : `${STATUS_CONFIG[filter]?.label || filter}`}
                  {" "}({filteredTenants.length})
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {filter !== "all" && (
                    <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                      Effacer filtre
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucun resultat</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patisserie</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fin essai / periode</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenants.map((tenant) => {
                        const config = STATUS_CONFIG[tenant.subscription_status] || STATUS_CONFIG.trial
                        const StatusIcon = config.icon
                        return (
                          <TableRow key={tenant.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-background"
                                  style={{ backgroundColor: tenant.primary_color }}
                                >
                                  {tenant.name.charAt(0).toUpperCase()}
                                </div>
                                <p className="text-sm font-medium">{tenant.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {PLAN_LABELS[tenant.subscription_plan] || tenant.subscription_plan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.variant} className="text-[10px]">
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {tenant.trial_ends_at
                                ? new Date(tenant.trial_ends_at).toLocaleDateString("fr-FR")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/super-admin/tenants/${tenant.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Voir</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tous les paiements ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucun paiement enregistre</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Patisserie</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Methode</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Periode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            {new Date(payment.confirmed_at).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{payment.tenant_name || "Inconnu"}</TableCell>
                          <TableCell className="text-sm font-medium">{payment.amount} TND</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {payment.payment_method === "especes" ? "Especes" : payment.payment_method === "virement" ? "Virement" : "Cheque"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{payment.reference || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(payment.period_start).toLocaleDateString("fr-FR")} - {new Date(payment.period_end).toLocaleDateString("fr-FR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
