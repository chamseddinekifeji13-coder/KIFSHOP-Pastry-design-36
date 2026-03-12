"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  ClipboardCheck,
  Store,
  Radio,
  Truck,
  UserPlus,
  Lock,
  LifeBuoy,
  Users,
  BarChart3,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTenant, canAccessRoute, ROLE_LABELS } from "@/lib/tenant-context"
import { useI18n } from "@/lib/i18n/context"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

const navigation = [
  {
    titleKey: "nav.general",
    fallback: "General",
    items: [
      { titleKey: "nav.dashboard", fallback: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    titleKey: "nav.commerce",
    fallback: "Commerce",
    items: [
      { titleKey: "nav.orders", fallback: "Commandes", href: "/commandes", icon: ShoppingCart },
      { titleKey: "nav.store", fallback: "E-Boutique", href: "/boutique", icon: Store },
      { titleKey: "nav.channels", fallback: "Canaux de vente", href: "/canaux", icon: Radio },
    ],
  },
  {
    titleKey: "nav.crm",
    fallback: "CRM",
    items: [
      { titleKey: "nav.clients", fallback: "Clients", href: "/clients", icon: Users },
      { titleKey: "nav.prospects", fallback: "Prospects", href: "/prospects", icon: UserPlus },
      { titleKey: "nav.campaigns", fallback: "Campagnes", href: "/campagnes", icon: Megaphone },
      { titleKey: "nav.performance", fallback: "Performance", href: "/performance", icon: BarChart3 },
    ],
  },
  {
    titleKey: "nav.operations",
    fallback: "Operations",
    items: [
      { titleKey: "nav.stocks", fallback: "Stocks", href: "/stocks", icon: Package },
      { titleKey: "nav.inventory", fallback: "Inventaire", href: "/inventaire", icon: ClipboardCheck },
      { titleKey: "nav.production", fallback: "Production", href: "/production", icon: ChefHat },
      { titleKey: "nav.supply", fallback: "Approvisionnement", href: "/approvisionnement", icon: Truck },
    ],
  },
  {
    titleKey: "nav.finance",
    fallback: "Finance",
    items: [
      { titleKey: "nav.treasury", fallback: "Tresorerie", href: "/tresorerie", icon: Wallet },
    ],
  },
  {
    titleKey: "nav.administration",
    fallback: "Administration",
    items: [
      { titleKey: "nav.settings", fallback: "Parametres", href: "/parametres", icon: Settings },
      { titleKey: "nav.support", fallback: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentTenant, currentUser, currentRole, authUser, users, signOut, isLoading } = useTenant()
  const { t } = useI18n()
  const { setOpenMobile, isMobile } = useSidebar()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    // Clear server-side active profile cookie
    await fetch("/api/verify-pin", { method: "DELETE" }).catch(() => {})
    sessionStorage.removeItem("kifshop_unlocked_at")
    await signOut()
  }

  // Filter navigation groups based on user role
  const filteredNavigation = navigation
    .map((group) => ({
      ...group,
      title: t(group.titleKey) || group.fallback,
      items: group.items
        .filter((item) => canAccessRoute(currentRole, item.href))
        .map((item) => ({ ...item, title: t(item.titleKey) || item.fallback })),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-primary-foreground"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            {currentTenant.logo}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">
              {currentTenant.name}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge
                variant="secondary"
                className="w-fit text-[10px] px-1.5 py-0"
              >
                {ROLE_LABELS[currentRole]}
              </Badge>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {filteredNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <Link 
                        href={item.href} 
                        prefetch={true}
                        onClick={() => { if (isMobile) setOpenMobile(false) }}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {currentUser.initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate">{currentUser.name}</span>
                {authUser?.email && (
                  <span className="text-[10px] text-muted-foreground truncate">{authUser.email}</span>
                )}
                <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[currentRole]}</span>
              </div>
            </div>
          </SidebarMenuItem>
          {users.length > 1 && users.some((u) => u.pin) && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t("nav.lock")}
                onClick={async () => {
                  // Clear server-side active profile cookie
                  await fetch("/api/verify-pin", { method: "DELETE" })
                  sessionStorage.removeItem("kifshop_unlocked_at")
                  window.location.reload()
                }}
              >
                <Lock className="h-4 w-4" />
                <span>{t("nav.lock")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t("nav.logout")} onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span>{signingOut ? t("nav.logout") + "..." : t("nav.logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
