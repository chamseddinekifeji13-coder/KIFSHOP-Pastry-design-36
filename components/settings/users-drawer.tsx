"use client"

import { useState } from "react"
import { Plus, Trash2, X, Save, Users, Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { Separator } from "@/components/ui/separator"
import { useTenant, ALL_ROLES, ROLE_LABELS, type UserRole } from "@/lib/tenant-context"
import { toast } from "sonner"

interface UsersDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_COLORS: Record<UserRole, string> = {
  gerant: "bg-amber-100 text-amber-800 border-amber-200",
  vendeur: "bg-blue-100 text-blue-800 border-blue-200",
  magasinier: "bg-emerald-100 text-emerald-800 border-emerald-200",
  achat: "bg-purple-100 text-purple-800 border-purple-200",
  caissier: "bg-rose-100 text-rose-800 border-rose-200",
}

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function UsersDrawer({ open, onOpenChange }: UsersDrawerProps) {
  const { users, currentUser, addUser, updateUser, removeUser } = useTenant()

  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("vendeur")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState<UserRole>("vendeur")

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error("Veuillez saisir un nom")
      return
    }

    const initials = generateInitials(newName)
    addUser({ name: newName.trim(), role: newRole, initials })

    toast.success("Utilisateur ajoute", {
      description: `${newName.trim()} a ete ajoute en tant que ${ROLE_LABELS[newRole]}`,
    })
    setNewName("")
    setNewRole("vendeur")
  }

  const startEdit = (user: { id: string; name: string; role: UserRole }) => {
    setEditingId(user.id)
    setEditName(user.name)
    setEditRole(user.role)
  }

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return
    const initials = generateInitials(editName)
    updateUser(editingId, { name: editName.trim(), role: editRole, initials })
    toast.success("Utilisateur modifie")
    setEditingId(null)
  }

  const handleRemove = (id: string, name: string) => {
    if (id === currentUser.id) {
      toast.error("Impossible de supprimer l'utilisateur actif")
      return
    }
    removeUser(id)
    toast.success("Utilisateur supprime", {
      description: `${name} a ete retire de la liste`,
    })
  }

  const groupedUsers = ALL_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    users: users.filter((u) => u.role === role),
  }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gestion des utilisateurs</SheetTitle>
          <SheetDescription>
            Ajoutez, modifiez ou supprimez les utilisateurs et leurs profils d{"'"}acces
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Add new user */}
          <div className="rounded-lg border p-4 space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Ajouter un utilisateur
            </Label>

            <div className="space-y-3">
              <Input
                placeholder="Nom de l'utilisateur"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                }}
              />
              <div className="flex gap-2">
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger className="flex-1">
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
                <Button onClick={handleAdd} className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Users list grouped by role */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Utilisateurs ({users.length})
              </Label>
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
                  <div className="rounded-lg border divide-y">
                    {group.users.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3">
                        {editingId === user.id ? (
                          <>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-muted">
                                {generateInitials(editName || user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm flex-1"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary shrink-0"
                              onClick={saveEdit}
                            >
                              <Check className="h-3.5 w-3.5" />
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
                              <AvatarFallback className="text-xs bg-muted">
                                {user.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{user.name}</p>
                            </div>
                            {user.id === currentUser.id && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Actif
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => startEdit(user)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleRemove(user.id, user.name)}
                              disabled={user.id === currentUser.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pl-2">
                    Aucun utilisateur pour ce profil
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            Fermer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
