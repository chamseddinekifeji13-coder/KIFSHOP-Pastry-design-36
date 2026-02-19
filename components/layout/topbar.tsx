"use client"

import { useState } from "react"
import { Bell, BellOff, ChevronDown, Menu, Users, UserPlus } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useDueReminders } from "@/hooks/use-tenant-data"
import { dismissReminder } from "@/lib/prospects/actions"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PinDialog } from "@/components/pin-dialog"
import {
  useTenant,
  ROLE_LABELS,
  canAccessRoute,
  getDefaultRoute,
  type UserRole,
  type AppUser,
} from "@/lib/tenant-context"

const roleGroups: UserRole[] = ["owner", "gerant", "vendeur", "magasinier", "achat", "caissier", "patissier"]

export function Topbar() {
  const {
    currentTenant,
    tenants,
    setCurrentTenant,
    currentUser,
    setCurrentUser,
    currentRole,
    users,
    authUser,
    signOut,
  } = useTenant()
  const router = useRouter()
  const pathname = usePathname()
  const { data: reminders = [], mutate: mutateReminders } = useDueReminders()

  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null)

  async function handleDismissReminder(id: string) {
    await dismissReminder(id)
    mutateReminders()
    toast.success("Rappel ignore")
  }

  function handleUserSwitch(userId: string) {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    // If it's the same user, do nothing
    if (user.id === currentUser.id) return

    // If the user has a PIN, ask for it
    if (user.pin) {
      setPendingUser(user)
      setPinDialogOpen(true)
      return
    }

    // No PIN set - switch directly (owner account linked to auth)
    completeUserSwitch(user)
  }

  function completeUserSwitch(user: AppUser) {
    setCurrentUser(user)
    toast.success(`Connecte en tant que ${user.name}`)
    // If current page is not accessible for the new user, redirect
    if (!canAccessRoute(user.role, pathname)) {
      router.push(getDefaultRoute(user.role))
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </SidebarTrigger>

        {/* Tenant Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-primary-foreground"
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                {currentTenant.logo}
              </div>
              <span className="hidden font-medium sm:inline-block">
                {currentTenant.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Changer de boutique</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => setCurrentTenant(tenant)}
                className="flex items-center gap-2"
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-primary-foreground"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  {tenant.logo}
                </div>
                <span>{tenant.name}</span>
                {currentTenant.id === tenant.id && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    Actif
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        {/* User / Role Selector (for demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent gap-2">
              <Users className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{currentUser.name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {ROLE_LABELS[currentRole]}
              </Badge>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Changer d{"'"}utilisateur</DropdownMenuLabel>
            {roleGroups.map((role) => {
              const usersInRole = users.filter((u) => u.role === role)
              if (usersInRole.length === 0) return null
              return (
                <div key={role}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                    {ROLE_LABELS[role]}
                  </DropdownMenuLabel>
                  {usersInRole.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => handleUserSwitch(user.id)}
                      className="flex items-center gap-2"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                        {user.initials}
                      </div>
                      <span>{user.name}</span>
                      {currentUser.id === user.id && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          Actif
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications / Prospect Reminders */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {reminders.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white animate-pulse">
                  {reminders.length}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Rappels prospects</span>
              {reminders.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{reminders.length}</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {reminders.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun rappel en attente
              </div>
            ) : (
              <>
                {reminders.slice(0, 5).map((r) => (
                  <DropdownMenuItem key={r.id} className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => router.push("/prospects")}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 mt-0.5">
                      <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.phone || "Pas de telephone"} - Relancer maintenant
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); handleDismissReminder(r.id) }}>
                      <BellOff className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuItem>
                ))}
                {reminders.length > 5 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-center text-xs text-muted-foreground justify-center" onClick={() => router.push("/prospects")}>
                      Voir les {reminders.length - 5} autres rappels
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-xs font-medium text-[#4A7C59]" onClick={() => router.push("/prospects")}>
              Voir tous les prospects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {currentUser.initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{currentUser.name}</span>
                {authUser?.email && (
                  <span className="text-xs font-normal text-muted-foreground truncate">
                    {authUser.email}
                  </span>
                )}
                <span className="text-xs font-normal text-muted-foreground">
                  {ROLE_LABELS[currentRole]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mon profil</DropdownMenuItem>
            <DropdownMenuItem>Parametres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* PIN Dialog for employee switch */}
      {pendingUser && (
        <PinDialog
          open={pinDialogOpen}
          onOpenChange={(open) => {
            setPinDialogOpen(open)
            if (!open) setPendingUser(null)
          }}
          userName={pendingUser.name}
          userInitials={pendingUser.initials}
          userRole={ROLE_LABELS[pendingUser.role]}
          expectedPin={pendingUser.pin || ""}
          onSuccess={() => completeUserSwitch(pendingUser)}
        />
      )}
    </header>
  )
}
