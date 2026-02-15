"use client"

import { useEffect, useState, useTransition } from "react"
import { Settings, Save, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  getPlatformSettings,
  updatePlatformSettings,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  type PlatformSettings,
  type SubscriptionPlan,
} from "@/lib/super-admin/actions"

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [trialDays, setTrialDays] = useState("")
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [planEdits, setPlanEdits] = useState<Partial<SubscriptionPlan>>({})

  useEffect(() => {
    async function load() {
      try {
        const [settingsData, plansData] = await Promise.all([
          getPlatformSettings(),
          getSubscriptionPlans(),
        ])
        setSettings(settingsData)
        setTrialDays(settingsData.default_trial_days)
        setPlans(plansData)
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleSaveSettings() {
    startTransition(async () => {
      try {
        await updatePlatformSettings({ default_trial_days: trialDays })
        toast.success("Parametres sauvegardes")
      } catch (error) {
        toast.error("Erreur lors de la sauvegarde")
      }
    })
  }

  function handleStartEditPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan.id)
    setPlanEdits({
      price_monthly: plan.price_monthly,
      max_sales_channels: plan.max_sales_channels,
      max_warehouses: plan.max_warehouses,
      max_users: plan.max_users,
    })
  }

  function handleSavePlan(planId: string) {
    startTransition(async () => {
      try {
        await updateSubscriptionPlan(planId, planEdits)
        setPlans((prev) =>
          prev.map((p) => (p.id === planId ? { ...p, ...planEdits } : p))
        )
        setEditingPlan(null)
        setPlanEdits({})
        toast.success("Plan mis a jour")
      } catch (error) {
        toast.error("Erreur lors de la mise a jour")
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Parametres de la plateforme
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurez la periode d{"'"}essai et les packs d{"'"}abonnement
        </p>
      </div>

      {/* Trial Period Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periode d{"'"}essai par defaut</CardTitle>
          <CardDescription>
            Duree de la periode de grace accordee automatiquement a chaque nouvelle patisserie inscrite.
            Vous pouvez aussi personnaliser la duree pour chaque patisserie individuellement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="trial-days">Nombre de jours</Label>
              <Input
                id="trial-days"
                type="number"
                min="1"
                max="365"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isPending}
              size="sm"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Packs d{"'"}abonnement</CardTitle>
          <CardDescription>
            Gerez les tarifs et les limites de chaque pack. Les changements s{"'"}appliquent aux nouveaux abonnements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack</TableHead>
                  <TableHead>Prix mensuel (TND)</TableHead>
                  <TableHead>Points de vente</TableHead>
                  <TableHead>Depots</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.display_name}</p>
                        <p className="text-xs text-muted-foreground">{plan.features?.description || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingPlan === plan.id ? (
                        <Input
                          type="number"
                          min="0"
                          value={planEdits.price_monthly ?? ""}
                          onChange={(e) => setPlanEdits({ ...planEdits, price_monthly: Number(e.target.value) })}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-medium">{plan.price_monthly} TND</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPlan === plan.id ? (
                        <Input
                          type="number"
                          min="1"
                          value={planEdits.max_sales_channels ?? ""}
                          onChange={(e) => setPlanEdits({ ...planEdits, max_sales_channels: Number(e.target.value) })}
                          className="w-20"
                        />
                      ) : (
                        plan.max_sales_channels
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPlan === plan.id ? (
                        <Input
                          type="number"
                          min="1"
                          value={planEdits.max_warehouses ?? ""}
                          onChange={(e) => setPlanEdits({ ...planEdits, max_warehouses: Number(e.target.value) })}
                          className="w-20"
                        />
                      ) : (
                        plan.max_warehouses
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPlan === plan.id ? (
                        <Input
                          type="number"
                          min="1"
                          value={planEdits.max_users ?? ""}
                          onChange={(e) => setPlanEdits({ ...planEdits, max_users: Number(e.target.value) })}
                          className="w-20"
                        />
                      ) : (
                        plan.max_users
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px]">
                        {plan.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingPlan === plan.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSavePlan(plan.id)}
                            disabled={isPending}
                          >
                            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingPlan(null); setPlanEdits({}) }}
                          >
                            X
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEditPlan(plan)}
                        >
                          Modifier
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
