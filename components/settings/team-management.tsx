"use client"

import { useState } from "react"
import { Users, Plus, Mail, Shield, User, Trash2, Copy, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface TeamMember {
  id: string
  email: string
  role: "admin" | "staff" | "viewer"
  created_at: string
}

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  staff: "Personnel",
  viewer: "Lecteur",
}

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  staff: "bg-secondary text-secondary-foreground",
  viewer: "bg-muted text-muted-foreground",
}

interface TeamManagementProps {
  currentRole: string
}

export function TeamManagement({ currentRole }: TeamManagementProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "staff" | "viewer">("staff")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Mock team members for display (will be replaced by real data)
  const [members] = useState<TeamMember[]>([
    { id: "1", email: "admin@kifshop.tn", role: "admin", created_at: "2026-01-15T10:00:00" },
  ])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Veuillez saisir un email")
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Sign up the new user (they will receive a confirmation email)
      const { error } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: Math.random().toString(36).slice(-12) + "A1!", // Temp password
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
          data: {
            invited_by: "admin",
            role: inviteRole,
          },
        },
      })

      if (error) throw error

      toast.success(`Invitation envoyee a ${inviteEmail}`)
      setInviteEmail("")
      setDrawerOpen(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'invitation"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/auth/sign-up`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success("Lien d'inscription copie")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteMember = () => {
    if (!memberToDelete) return
    toast.success(`${memberToDelete.email} a ete retire de l'equipe`)
    setDeleteDialogOpen(false)
    setMemberToDelete(null)
  }

  const isAdmin = currentRole === "admin"

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Equipe</CardTitle>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)} className="bg-transparent">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Inviter
              </Button>
            )}
          </div>
          <CardDescription>Gerez les membres de votre equipe et leurs permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  {member.role === "admin" ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Ajoute le {new Date(member.created_at).toLocaleDateString("fr-TN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={roleColors[member.role]} variant="secondary">
                  {roleLabels[member.role]}
                </Badge>
                {isAdmin && member.role !== "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setMemberToDelete(member)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {members.length === 1 && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Vous etes le seul membre. Invitez votre equipe pour collaborer.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invite Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Inviter un membre</SheetTitle>
            <SheetDescription>
              Ajoutez un collaborateur a votre boutique KIFSHOP
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Method 1: Email invite */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Methode 1 : Invitation par email</h3>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email du collaborateur</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="membre@boutique.tn"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v: "admin" | "staff" | "viewer") => setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">
                      <div className="flex flex-col items-start">
                        <span>Personnel</span>
                        <span className="text-xs text-muted-foreground">Peut creer des commandes et gerer le stock</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span>Lecteur</span>
                        <span className="text-xs text-muted-foreground">Peut consulter les donnees sans modifier</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span>Administrateur</span>
                        <span className="text-xs text-muted-foreground">Acces complet a toutes les fonctionnalites</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInvite} disabled={isLoading} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? "Envoi en cours..." : "Envoyer l'invitation"}
              </Button>
            </div>

            <Separator />

            {/* Method 2: Share signup link */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Methode 2 : Lien d{"'"}inscription</h3>
              <p className="text-sm text-muted-foreground">
                Partagez ce lien pour que vos collaborateurs s{"'"}inscrivent eux-memes.
                Vous pourrez ensuite les ajouter a votre boutique.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/sign-up`}
                  className="text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyInviteLink} className="shrink-0 bg-transparent">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Roles explanation */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Permissions par role</h3>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium">Administrateur</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Acces complet : parametres, equipe, abonnement, donnees
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Personnel</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Commandes, stocks, production, tresorerie (pas de parametres)
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Lecteur</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consultation uniquement, aucune modification possible
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete?.email} n{"'"}aura plus acces a votre boutique.
              Cette action est reversible en le re-invitant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
