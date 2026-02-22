"use client"

import { useState } from "react"
import { ChevronDown, Lock, Users } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { NotificationBell } from "@/components/layout/notification-bell"
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

  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null)

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
        <SidebarTrigger className="-ml-1 md:hidden" />

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

        {/* Notifications */}
        <NotificationBell />

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
          <DropdownMenuContent align="end" className="w-56">
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
            {/* Mobile-only user switcher (since the Users dropdown is hidden on sm) */}
            {users.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-normal sm:hidden">
                  Changer d{"'"}utilisateur
                </DropdownMenuLabel>
                {users.filter(u => u.id !== currentUser.id).slice(0, 5).map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    onClick={() => handleUserSwitch(user.id)}
                    className="flex items-center gap-2 sm:hidden"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
                      {user.initials}
                    </div>
                    <span className="text-xs">{user.name}</span>
                    <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/parametres")}>Mon profil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/parametres")}>Parametres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              sessionStorage.removeItem("kifshop_unlocked")
              window.location.reload()
            }}>
              <Lock className="mr-2 h-4 w-4" />
              Verrouiller
            </DropdownMenuItem>
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
