"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, Building2, MailCheck, Loader2, AlertCircle } from "lucide-react"
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

export function UsersListView() {
  const router = useRouter()
  const [users, setUsers] = useState<GlobalUser[]>([])
  const [unconfirmedUsers, setUnconfirmedUsers] = useState<UnconfirmedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [data, unconfirmed] = await Promise.all([
          getAllUsers(),
          getUnconfirmedUsers(),
        ])
        setUsers(data)
        setUnconfirmedUsers(unconfirmed)
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
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            {users.length} utilisateur{users.length !== 1 ? "s" : ""}
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
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Aucun resultat" : "Aucun utilisateur"}
          </p>
        ) : (
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
        )}
      </CardContent>
    </Card>
    </div>
  )
}
