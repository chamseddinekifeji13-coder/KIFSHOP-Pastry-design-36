"use client"

import { Bell, ChevronDown, Menu, Users } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import {
  useTenant,
  ROLE_LABELS,
  canAccessRoute,
  getDefaultRoute,
  type UserRole,
} from "@/lib/tenant-context"

const roleGroups: UserRole[] = ["gerant", "vendeur", "magasinier", "achat", "caissier"]

export function Topbar() {
  const {
    currentTenant,
    tenants,
    setCurrentTenant,
    currentUser,
    setCurrentUser,
    currentRole,
    users,
  } = useTenant()
  const router = useRouter()
  const pathname = usePathname()

  function handleUserSwitch(userId: string) {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    setCurrentUser(user)
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

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </Button>

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
                <span className="text-xs font-normal text-muted-foreground">
                  {ROLE_LABELS[currentRole]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mon profil</DropdownMenuItem>
            <DropdownMenuItem>Parametres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
