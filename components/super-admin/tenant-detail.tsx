"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Calendar,
  Pause,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  MailCheck,
  RefreshCw,
  ArrowUpCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  getTenantDetail,
  updateTenantStatus,
  deleteTenant,
  getSubscriptionPlans,
  activateTenantSubscription,
  suspendTenantSubscription,
  reactivateTenantSubscription,
  updateTenantAppVersion,
  getCurrentAppVersion,
  recordPayment,
  getTenantPayments,
  setTenantTrialDays,
  confirmUserEmail,
  getTenantUnconfirmedUserIds,
  type TenantDetail,
  type SubscriptionPlan,
  type PaymentRecord,
} from "@/lib/super-admin/actions"

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietaire",
  gerant: "Gerant",
  vendeur: "Vendeur",
  magasinier: "Magasinier",
  achat: "Achat",
  caissier: "Caissier",
  patissier: "Patissier",
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  trial: { label: "Periode d'essai", variant: "secondary", icon: Clock },
  active: { label: "Actif", variant: "default", icon: CheckCircle2 },
  expired: { label: "Expire", variant: "destructive", icon: AlertTriangle },
  suspended: { label: "Suspendu", variant: "destructive", icon: Pause },
}

export function TenantDetailView({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [appVersion, setAppVersion] = useState("1.2.0")

  // Activate subscription form
  const [activateOpen, setActivateOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [periodMonths, setPeriodMonths] = useState("1")

  // Record payment form
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("especes")
  const [paymentRef, setPaymentRef] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")

  // Unconfirmed user IDs
  const [unconfirmedIds, setUnconfirmedIds] = useState<Set<string>>(new Set())
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // Trial customization
  const [customTrialDays, setCustomTrialDays] = useState("")

  useEffect(() => {
    async function load() {
      try {
  const [tenantData, plansData, paymentsData, unconfirmedData, version] = await Promise.all([
  getTenantDetail(tenantId),
  getSubscriptionPlans(),
  getTenantPayments(tenantId),
  getTenantUnconfirmedUserIds(tenantId),
  getCurrentAppVersion(),
  ])
  setTenant(tenantData)
  setAppVersion(version)
        setPlans(plansData)
        setPayments(paymentsData)
        setUnconfirmedIds(new Set(unconfirmedData))
        if (plansData.length > 0) setSelectedPlanId(plansData[0].id)
      } catch (error) {
        console.error("Error loading tenant:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  function handleActivateSubscription() {
    if (!selectedPlanId) return
    startTransition(async () => {
      try {
        await activateTenantSubscription(tenantId, selectedPlanId, Number(periodMonths))
        const refreshed = await getTenantDetail(tenantId)
        setTenant(refreshed)
        setActivateOpen(false)
        toast.success("Abonnement active avec succes")
      } catch (error) {
        toast.error("Erreur lors de l'activation")
      }
    })
  }

  function handleSuspend() {
    startTransition(async () => {
      try {
        await suspendTenantSubscription(tenantId)
        const refreshed = await getTenantDetail(tenantId)
        setTenant(refreshed)
        toast.success("Compte suspendu")
      } catch (error) {
        toast.error("Erreur lors de la suspension")
      }
    })
  }

  function handleReactivate() {
    if (!tenant) return
    startTransition(async () => {
      try {
        await reactivateTenantSubscription(tenantId)
        const refreshed = await getTenantDetail(tenantId)
        setTenant(refreshed)
        toast.success("Compte reactive avec succes")
      } catch (error) {
        toast.error("Erreur lors de la reactivation")
      }
    })
  }

  function handleRecordPayment() {
    if (!tenant || !paymentAmount) return
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + Number(periodMonths || 1))

    startTransition(async () => {
      try {
        await recordPayment({
          tenantId: tenant.id,
          subscriptionId: tenant.subscription?.id || null,
          amount: Number(paymentAmount),
          paymentMethod,
          reference: paymentRef || undefined,
          notes: paymentNotes || undefined,
          periodStart: now.toISOString(),
          periodEnd: periodEnd.toISOString(),
        })
        const refreshedPayments = await getTenantPayments(tenantId)
        setPayments(refreshedPayments)
        setPaymentOpen(false)
        setPaymentAmount("")
        setPaymentRef("")
        setPaymentNotes("")
        toast.success("Paiement enregistre")
      } catch (error) {
        toast.error("Erreur lors de l'enregistrement du paiement")
      }
    })
  }

  function handleSetTrialDays() {
    if (!customTrialDays) return
    startTransition(async () => {
      try {
        await setTenantTrialDays(tenantId, Number(customTrialDays))
        const refreshed = await getTenantDetail(tenantId)
        setTenant(refreshed)
        setCustomTrialDays("")
        toast.success("Periode d'essai mise a jour")
      } catch (error) {
        toast.error("Erreur")
      }
    })
  }

  async function handleConfirmEmail(userId: string) {
    setConfirmingId(userId)
    try {
      await confirmUserEmail(userId)
      setUnconfirmedIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      toast.success("Email confirme avec succes")
    } catch {
      toast.error("Erreur lors de la confirmation")
    } finally {
      setConfirmingId(null)
    }
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTenant(tenantId)
        router.push("/super-admin/tenants")
      } catch (error) {
        toast.error("Erreur lors de la suppression")
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Patisserie introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/super-admin/tenants")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour a la liste
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[tenant.subscription_status] || STATUS_CONFIG.trial
  const StatusIcon = statusConfig.icon
  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/super-admin/tenants")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour</span>
          </Button>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-background"
            style={{ backgroundColor: tenant.primary_color }}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{tenant.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={statusConfig.variant} className="text-[10px]">
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusConfig.label}
              </Badge>
              {tenant.subscription?.plan_display_name && (
                <Badge variant="outline" className="text-[10px]">
                  {tenant.subscription.plan_display_name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette patisserie ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irreversible. La patisserie <strong>{tenant.name}</strong> et toutes ses donnees seront definitivement supprimees.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Statut</p>
              <Badge variant={statusConfig.variant} className="text-xs">
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Plan actuel</p>
              <p className="text-sm font-medium">{tenant.subscription?.plan_display_name || "Aucun (essai)"}</p>
            </div>
            {tenant.subscription_status === "trial" && trialEndsAt && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Fin de l{"'"}essai</p>
                <p className="text-sm font-medium">
                  {trialEndsAt.toLocaleDateString("fr-FR")} ({trialDaysLeft}j restants)
                </p>
              </div>
            )}
            {tenant.subscription?.current_period_end && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Fin de periode</p>
                <p className="text-sm font-medium">
                  {new Date(tenant.subscription.current_period_end).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {/* Activate / Renew Subscription */}
            <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  {tenant.subscription_status === "active" ? "Renouveler" : "Activer l'abonnement"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Activer l{"'"}abonnement</DialogTitle>
                  <DialogDescription>
                    Choisissez un pack et la duree pour <strong>{tenant.name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Pack</Label>
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un pack" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.display_name} - {p.price_monthly} TND/mois ({p.max_sales_channels} PDV, {p.max_warehouses} depots)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duree (mois)</Label>
                    <Select value={periodMonths} onValueChange={setPeriodMonths}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 mois</SelectItem>
                        <SelectItem value="3">3 mois</SelectItem>
                        <SelectItem value="6">6 mois</SelectItem>
                        <SelectItem value="12">12 mois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedPlan && (
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="font-medium">Resume :</p>
                      <p>{selectedPlan.display_name} x {periodMonths} mois = <strong>{selectedPlan.price_monthly * Number(periodMonths)} TND</strong></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Limites : {selectedPlan.max_sales_channels} points de vente, {selectedPlan.max_warehouses} depots, {selectedPlan.max_users} utilisateurs
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActivateOpen(false)}>Annuler</Button>
                  <Button onClick={handleActivateSubscription} disabled={isPending || !selectedPlanId}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Activer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Suspend */}
            {(tenant.subscription_status === "active" || tenant.subscription_status === "trial") && (
              <Button size="sm" variant="outline" onClick={handleSuspend} disabled={isPending}>
                <Pause className="mr-2 h-3.5 w-3.5" />
                Suspendre
              </Button>
            )}

            {/* Reactivate */}
            {tenant.subscription_status === "suspended" && (
              <Button size="sm" variant="outline" onClick={handleReactivate} disabled={isPending}>
                <Play className="mr-2 h-3.5 w-3.5" />
                Reactiver
              </Button>
            )}

            {/* Record Payment */}
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Receipt className="mr-2 h-3.5 w-3.5" />
                  Enregistrer paiement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enregistrer un paiement</DialogTitle>
                  <DialogDescription>
                    Confirmez le paiement recu de <strong>{tenant.name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Montant (TND)</Label>
                    <Input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="49" />
                  </div>
                  <div className="space-y-2">
                    <Label>Methode</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="especes">Especes</SelectItem>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference (optionnel)</Label>
                    <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Numero de virement..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optionnel)</Label>
                    <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Remarques..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentOpen(false)}>Annuler</Button>
                  <Button onClick={handleRecordPayment} disabled={isPending || !paymentAmount}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Custom Trial */}
          {tenant.subscription_status === "trial" && (
            <div className="flex items-end gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Personnaliser essai (jours a partir d{"'"}aujourd{"'"}hui)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={customTrialDays}
                  onChange={(e) => setCustomTrialDays(e.target.value)}
                  className="w-28"
                  placeholder="30"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleSetTrialDays} disabled={isPending || !customTrialDays}>
                Appliquer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.users.length}</div>
            <p className="text-xs text-muted-foreground">membres de l{"'"}equipe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Date creation</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(tenant.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paiements</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              Total: {payments.reduce((sum, p) => sum + Number(p.amount), 0)} TND
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Version</CardTitle>
            <ArrowUpCircle className={`h-4 w-4 ${tenant.app_version !== appVersion ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${tenant.app_version !== appVersion ? "text-amber-600" : ""}`}>
                v{tenant.app_version}
              </span>
              {tenant.app_version !== appVersion && (
                <Badge variant="secondary" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                  obsolete
                </Badge>
              )}
            </div>
            {tenant.app_version !== appVersion ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs gap-1.5 w-full"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await updateTenantAppVersion(tenantId)
                      const refreshed = await getTenantDetail(tenantId)
                      setTenant(refreshed)
                      toast.success("Version mise a jour")
                    } catch {
                      toast.error("Erreur de mise a jour")
                    }
                  })
                }}
              >
                <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
                Mettre a jour vers v{appVersion}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">A jour</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe ({tenant.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun utilisateur</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date ajout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {user.display_name ? user.display_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?"}
                          </div>
                          <span className="text-sm font-medium">{user.display_name || "Sans nom"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[user.role] || user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {unconfirmedIds.has(user.user_id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5"
                            disabled={confirmingId === user.user_id}
                            onClick={() => handleConfirmEmail(user.user_id)}
                          >
                            {confirmingId === user.user_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <MailCheck className="h-3 w-3" />
                            )}
                            Confirmer email
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                            Confirme
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun paiement enregistre</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
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
    </div>
  )
}
