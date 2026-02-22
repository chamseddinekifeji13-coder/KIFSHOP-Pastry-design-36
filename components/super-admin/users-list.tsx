"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, Building2, MailCheck, Loader2, AlertCircle, ChevronDown, ChevronRight, LayoutList, List } from "lucide-react"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getAllUsers, getUnconfirmedUsers, confirmUserEmail, type GlobalUser, type UnconfirmedUser } from "@/lib/super-admin/actions"
import { toast } from "sonner"

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

interface TenantGroup {
  tenantId: string
  tenantName: string
  users: GlobalUser[]
}

export function UsersListView() {
  const router = useRouter()
  const [users, setUsers] = useState<GlobalUser[]>([])
  const [unconfirmedUsers, setUnconfirmedUsers] = useState<UnconfirmedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped")
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const [data, unconfirmed] = await Promise.all([
          getAllUsers(),
          getUnconfirmedUsers(),
        ])
        setUsers(data)
        setUnconfirmedUsers(unconfirmed)
        // Auto-expand all tenants on first load
        const allTenantIds = new Set(data.map(u => u.tenant_id))
        setExpandedTenants(allTenantIds)
      } catch (error) {
        console.error("Error loading users:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleConfirmEmail(userId: string) {
    setConfirmingId(userId)
    try {
      await confirmUserEmail(userId)
      setUnconfirmedUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success("Email confirme avec succes")
    } catch {
      toast.error("Erreur lors de la confirmation")
    } finally {
      setConfirmingId(null)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  )

  // Group users by tenant
  const tenantGroups = useMemo<TenantGroup[]>(() => {
    const grouped = new Map<string, TenantGroup>()
    for (const user of filteredUsers) {
      if (!grouped.has(user.tenant_id)) {
        grouped.set(user.tenant_id, {
          tenantId: user.tenant_id,
          tenantName: user.tenant_name,
          users: [],
        })
      }
      grouped.get(user.tenant_id)!.users.push(user)
    }
    return Array.from(grouped.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName))
  }, [filteredUsers])

  function toggleTenant(tenantId: string) {
    setExpandedTenants(prev => {
      const next = new Set(prev)
      if (next.has(tenantId)) next.delete(tenantId)
      else next.add(tenantId)
      return next
    })
  }

  function toggleAll() {
    if (expandedTenants.size === tenantGroups.length) {
      setExpandedTenants(new Set())
    } else {
      setExpandedTenants(new Set(tenantGroups.map(g => g.tenantId)))
    }
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
    {/* Unconfirmed Users Alert */}
    {unconfirmedUsers.length > 0 && (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            {unconfirmedUsers.length} inscription{unconfirmedUsers.length > 1 ? "s" : ""} en attente de confirmation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Patisserie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unconfirmedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-sm font-medium">{user.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.tenant_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1.5"
                        disabled={confirmingId === user.id}
                        onClick={() => handleConfirmEmail(user.id)}
                      >
                        {confirmingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MailCheck className="h-3 w-3" />
                        )}
                        Confirmer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              {users.length} utilisateur{users.length !== 1 ? "s" : ""}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {tenantGroups.length} patisserie{tenantGroups.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center rounded-md border">
              <Button
                variant={viewMode === "grouped" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-r-none px-2.5"
                onClick={() => setViewMode("grouped")}
                title="Vue groupee par patisserie"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "flat" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-l-none px-2.5 border-l"
                onClick={() => setViewMode("flat")}
                title="Vue liste plate"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Aucun resultat" : "Aucun utilisateur"}
          </p>
        ) : viewMode === "flat" ? (
          /* ── Flat table view ── */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Patisserie</TableHead>
                  <TableHead>Date ajout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={`${user.user_id}-${user.tenant_id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {user.display_name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium">
                          {user.display_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        onClick={() =>
                          router.push(
                            `/super-admin/tenants/${user.tenant_id}`
                          )
                        }
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        {user.tenant_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* ── Grouped by patisserie view ── */
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={toggleAll}>
                {expandedTenants.size === tenantGroups.length ? "Tout replier" : "Tout deployer"}
              </Button>
            </div>
            {tenantGroups.map((group) => {
              const isExpanded = expandedTenants.has(group.tenantId)
              const rolesSummary = Object.entries(
                group.users.reduce<Record<string, number>>((acc, u) => {
                  const label = ROLE_LABELS[u.role] || u.role
                  acc[label] = (acc[label] || 0) + 1
                  return acc
                }, {})
              )
              return (
                <Collapsible key={group.tenantId} open={isExpanded} onOpenChange={() => toggleTenant(group.tenantId)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                        {group.tenantName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{group.tenantName}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {group.users.length} utilisateur{group.users.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rolesSummary.map(([role, count]) => (
                            <span key={role} className="text-[10px] text-muted-foreground">
                              {count} {role}{count > 1 ? "s" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/super-admin/tenants/${group.tenantId}`)
                          }}
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          Voir
                        </Button>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 mb-2 border-l-2 border-muted pl-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Utilisateur</TableHead>
                            <TableHead className="text-xs">Role</TableHead>
                            <TableHead className="text-xs">Date ajout</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.users.map((user) => (
                            <TableRow key={`${user.user_id}-${user.tenant_id}`} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                                    {user.display_name
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </div>
                                  <span className="text-sm">{user.display_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {ROLE_LABELS[user.role] || user.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString("fr-FR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
