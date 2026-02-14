"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Search,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  Eye,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getAllTenants,
  updateTenantStatus,
  deleteTenant,
  type TenantOverview,
} from "@/lib/super-admin/actions"

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

export function TenantsList() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<TenantOverview | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllTenants()
        setTenants(data)
      } catch (error) {
        console.error("Error loading tenants:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  )

  function handleToggleStatus(tenant: TenantOverview) {
    startTransition(async () => {
      try {
        await updateTenantStatus(tenant.id, !tenant.is_active)
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenant.id ? { ...t, is_active: !t.is_active } : t
          )
        )
      } catch (error) {
        console.error("Error updating tenant status:", error)
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      try {
        await deleteTenant(deleteTarget.id)
        setTenants((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        setDeleteTarget(null)
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {tenants.length} patisserie{tenants.length !== 1 ? "s" : ""} enregistree{tenants.length !== 1 ? "s" : ""}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search ? "Aucun resultat" : "Aucune patisserie enregistree"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patisserie</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Utilisateurs</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date creation</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-background"
                            style={{ backgroundColor: tenant.primary_color }}
                          >
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tenant.name}</p>
                            {tenant.slug && (
                              <p className="text-xs text-muted-foreground">
                                {tenant.slug}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {PLAN_LABELS[tenant.subscription_plan] || tenant.subscription_plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {tenant.user_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tenant.is_active ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {tenant.is_active ? "Actif" : "Suspendu"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tenant.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/super-admin/tenants/${tenant.id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(tenant)}
                              disabled={isPending}
                            >
                              {tenant.is_active ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Suspendre
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Reactiver
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(tenant)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette patisserie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La patisserie{" "}
              <strong>{deleteTarget?.name}</strong> et toutes ses donnees seront
              definitivement supprimees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
