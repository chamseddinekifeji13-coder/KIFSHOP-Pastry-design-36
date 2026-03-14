"use client"

import { useState } from "react"
import { ChevronDown, Lock, Users, KeyRound, Globe } from "lucide-react"
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
import { ChangePinDialog } from "@/components/change-pin-dialog"
import {
  useTenant,
  ROLE_LABELS,
  canAccessRoute,
  getDefaultRoute,
  type UserRole,
  type AppUser,
} from "@/lib/tenant-context"
import { useI18n } from "@/lib/i18n/context"

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
  const { locale, setLocale, t } = useI18n()

  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null)
  const [changePinOpen, setChangePinOpen] = useState(false)

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
    toast.success(`${t("topbar.connected_as")} ${user.name}`)
    // If current page is not accessible for the new user, redirect
    if (!canAccessRoute(user.role, pathname)) {
      router.push(getDefaultRoute(user.role))
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-card/95 backdrop-blur-xl shadow-sm px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1 lg:hidden" />

        {/* Tenant Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/50 transition-colors">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-background shadow-md transition-all"
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
            <DropdownMenuLabel>{t("topbar.switch_shop")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => setCurrentTenant(tenant)}
                className="flex items-center gap-2"
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-background shadow-sm"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  {tenant.logo}
                </div>
                <span>{tenant.name}</span>
                {currentTenant.id === tenant.id && (
                  <Badge className="ml-auto text-[10px] bg-primary text-background" >
                    {t("topbar.active")}
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
            <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent gap-2 border-primary/30 hover:bg-muted/50">
              <Users className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{currentUser.name}</span>
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary hover:bg-primary/30">
                {ROLE_LABELS[currentRole]}
              </Badge>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("topbar.switch_user")}</DropdownMenuLabel>
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
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium text-primary">
                        {user.initials}
                      </div>
                      <span>{user.name}</span>
                      {currentUser.id === user.id && (
                        <Badge className="ml-auto text-[10px] bg-primary text-background">
                          {t("topbar.active")}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language Switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
          className="relative h-8 w-8 hover:bg-muted/50"
          title={t("topbar.language")}
        >
          <Globe className="h-4 w-4" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-background shadow-md">
            {locale === "fr" ? "ع" : "Fr"}
          </span>
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-background text-xs font-medium">
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
                  {t("topbar.switch_user")}
                </DropdownMenuLabel>
                {users.filter(u => u.id !== currentUser.id).slice(0, 5).map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    onClick={() => handleUserSwitch(user.id)}
                    className="flex items-center gap-2 sm:hidden"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-medium text-primary">
                      {user.initials}
                    </div>
                    <span className="text-xs">{user.name}</span>
                    <Badge className="ml-auto text-[9px] px-1 py-0 bg-primary/10">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/parametres")}>{t("topbar.my_profile")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChangePinOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              {currentUser.pin ? t("topbar.change_pin") : t("topbar.set_pin")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/parametres")}>{t("settings.title")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              await fetch("/api/verify-pin", { method: "DELETE" }).catch(() => {})
              sessionStorage.removeItem("kifshop_unlocked_at")
              window.location.reload()
            }}>
              <Lock className="mr-2 h-4 w-4" />
              {t("topbar.lock")}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
              {t("topbar.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* PIN Dialog for user switch (server-side verification) */}
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
          tenantUserId={pendingUser.dbId || pendingUser.id}
          onSuccess={() => completeUserSwitch(pendingUser)}
        />
      )}

      {/* Change own PIN dialog */}
      <ChangePinDialog open={changePinOpen} onOpenChange={setChangePinOpen} />
    </header>
  )
}
