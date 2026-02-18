"use client"

import { useState } from "react"
import { Plus, Trash2, X, Users, Pencil, Check, UserPlus, Shield, Sparkles, Loader2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTenant, ALL_ROLES, ROLE_LABELS, type UserRole } from "@/lib/tenant-context"
import { addEmployee, updateEmployee, removeEmployee } from "@/lib/employees/actions"
import { toast } from "sonner"

interface UsersDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: "bg-slate-100 text-slate-800 border-slate-200",
  gerant: "bg-amber-100 text-amber-800 border-amber-200",
  vendeur: "bg-blue-100 text-blue-800 border-blue-200",
  magasinier: "bg-emerald-100 text-emerald-800 border-emerald-200",
  achat: "bg-purple-100 text-purple-800 border-purple-200",
  caissier: "bg-rose-100 text-rose-800 border-rose-200",
  patissier: "bg-orange-100 text-orange-800 border-orange-200",
}

const ROLE_AVATAR_COLORS: Record<UserRole, string> = {
  owner: "bg-slate-100 text-slate-700",
  gerant: "bg-amber-100 text-amber-700",
  vendeur: "bg-blue-100 text-blue-700",
  magasinier: "bg-emerald-100 text-emerald-700",
  achat: "bg-purple-100 text-purple-700",
  caissier: "bg-rose-100 text-rose-700",
  patissier: "bg-orange-100 text-orange-700",
}

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function UsersDrawer({ open, onOpenChange }: UsersDrawerProps) {
  const { users, currentUser, reloadUsers } = useTenant()

  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("vendeur")
  const [newPin, setNewPin] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState<UserRole>("vendeur")
  const [editPin, setEditPin] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Veuillez saisir un nom")
      return
    }
    setSaving(true)
    try {
      await addEmployee({
        display_name: newName.trim(),
        role: newRole,
        pin: newPin || undefined,
      })
      await reloadUsers()
      toast.success("Employe ajoute", {
        description: `${newName.trim()} a ete ajoute en tant que ${ROLE_LABELS[newRole]}`,
      })
      setNewName("")
      setNewRole("vendeur")
      setNewPin("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (user: { id: string; name: string; role: UserRole; dbId?: string; pin?: string }) => {
    setEditingId(user.id)
    setEditName(user.name)
    setEditRole(user.role)
    setEditPin(user.pin || "")
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return
    const targetUser = users.find((u) => u.id === editingId)
    if (!targetUser?.dbId) {
      toast.error("Impossible de modifier cet utilisateur")
      return
    }
    setSaving(true)
    try {
      await updateEmployee(targetUser.dbId, {
        display_name: editName.trim(),
        role: editRole,
        pin: editPin || null,
      })
      await reloadUsers()
      toast.success("Employe modifie")
      setEditingId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string, name: string) => {
    if (id === currentUser.id) {
      toast.error("Impossible de supprimer l'utilisateur actif")
      return
    }
    const targetUser = users.find((u) => u.id === id)
    if (!targetUser?.dbId) return
    setRemovingId(id)
    try {
      await removeEmployee(targetUser.dbId)
      await reloadUsers()
      toast.success("Employe supprime", {
        description: `${name} a ete retire de l'equipe`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression")
    } finally {
      setRemovingId(null)
    }
  }

  // Show all roles in grouping but owner at top
  const groupedUsers = ALL_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    users: users.filter((u) => u.role === role),
  }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-b px-6 pt-6 pb-5">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg">Gestion des utilisateurs</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {users.length} membre{users.length !== 1 ? "s" : ""} dans votre equipe
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Add new user section */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UserPlus className="h-4 w-4 text-violet-500" />
              Ajouter un membre
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nom complet</Label>
                <Input
                  placeholder="Ex: Ahmed Ben Ali"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd()
                  }}
                  className="transition-all focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Profil d{"'"}acces</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-violet-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter((r) => r !== "owner").map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    Code PIN
                  </Label>
                  <Input
                    type="password"
                    placeholder="4 chiffres"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className="transition-all focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>
              <Button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Ajouter l{"'"}employe
              </Button>
            </div>
          </div>

          {/* Users list grouped by role */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Shield className="h-4 w-4 text-violet-500" />
              Equipe par profil
            </div>

            {groupedUsers.map((group) => (
              <div key={group.role} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[group.role]}`}>
                    {group.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {group.users.length} utilisateur{group.users.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {group.users.length > 0 ? (
                  <div className="rounded-xl border divide-y shadow-sm overflow-hidden">
                    {group.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/30"
                      >
                        {editingId === user.id ? (
                          <>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={`text-xs font-semibold ${ROLE_AVATAR_COLORS[editRole]}`}>
                                {generateInitials(editName || user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm flex-1 focus:ring-2 focus:ring-violet-200"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit()
                                if (e.key === "Escape") setEditingId(null)
                              }}
                              autoFocus
                            />
                            <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                              <SelectTrigger className="h-8 w-28 text-xs shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="password"
                              placeholder="PIN"
                              maxLength={4}
                              value={editPin}
                              onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                              className="h-8 w-16 text-xs shrink-0 focus:ring-2 focus:ring-violet-200"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                              onClick={saveEdit}
                              disabled={saving}
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground shrink-0"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={`text-xs font-semibold ${ROLE_AVATAR_COLORS[user.role]}`}>
                                {user.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{user.name}</p>
                            </div>
                            {user.id === currentUser.id && (
                              <Badge className="text-[10px] bg-violet-100 text-violet-700 border-violet-200 shrink-0">
                                Vous
                              </Badge>
                            )}
                            {user.pin && (
                              <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                                <KeyRound className="h-2.5 w-2.5" />
                                PIN
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
                              onClick={() => startEdit(user)}
                              disabled={saving}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => handleRemove(user.id, user.name)}
                              disabled={user.id === currentUser.id || removingId === user.id}
                            >
                              {removingId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Aucun utilisateur pour ce profil
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info tip */}
          <div className="flex items-start gap-2 rounded-xl bg-violet-50/50 border border-violet-100 p-3">
            <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700">
              Chaque profil d{"'"}acces definit les pages et actions disponibles pour l{"'"}utilisateur dans votre patisserie.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
