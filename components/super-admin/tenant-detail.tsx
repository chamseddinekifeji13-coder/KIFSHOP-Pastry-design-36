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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  getTenantDetail,
  updateTenantStatus,
  updateTenantPlan,
  deleteTenant,
  type TenantDetail,
} from "@/lib/super-admin/actions"

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

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

export function TenantDetailView({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      try {
        const data = await getTenantDetail(tenantId)
        setTenant(data)
      } catch (error) {
        console.error("Error loading tenant:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  function handleToggleStatus() {
    if (!tenant) return
    startTransition(async () => {
      try {
        await updateTenantStatus(tenant.id, !tenant.is_active)
        setTenant((prev) => (prev ? { ...prev, is_active: !prev.is_active } : prev))
      } catch (error) {
        console.error("Error updating status:", error)
      }
    })
  }

  function handlePlanChange(plan: string) {
    if (!tenant) return
    startTransition(async () => {
      try {
        await updateTenantPlan(tenant.id, plan)
        setTenant((prev) => (prev ? { ...prev, subscription_plan: plan } : prev))
      } catch (error) {
        console.error("Error updating plan:", error)
      }
    })
  }

  function handleDelete() {
    if (!tenant) return
    startTransition(async () => {
      try {
        await deleteTenant(tenant.id)
        router.push("/super-admin/tenants")
      } catch (error) {
        console.error("Error deleting tenant:", error)
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
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/super-admin/tenants")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour a la liste
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/super-admin/tenants")}
          >
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
              <Badge
                variant={tenant.is_active ? "default" : "secondary"}
                className="text-[10px]"
              >
                {tenant.is_active ? "Actif" : "Suspendu"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {PLAN_LABELS[tenant.subscription_plan] || tenant.subscription_plan}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={isPending}
          >
            {tenant.is_active ? (
              <>
                <Pause className="mr-2 h-3.5 w-3.5" />
                Suspendre
              </>
            ) : (
              <>
                <Play className="mr-2 h-3.5 w-3.5" />
                Reactiver
              </>
            )}
          </Button>

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
                  Cette action est irreversible. La patisserie{" "}
                  <strong>{tenant.name}</strong> et toutes ses donnees seront
                  definitivement supprimees.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abonnement</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Select
              value={tenant.subscription_plan}
              onValueChange={handlePlanChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Gratuit</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

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
              {new Date(tenant.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
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
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun utilisateur
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date ajout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {user.display_name
                              ? user.display_name
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "?"}
                          </div>
                          <span className="text-sm font-medium">
                            {user.display_name || "Sans nom"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
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
    </div>
  )
}
