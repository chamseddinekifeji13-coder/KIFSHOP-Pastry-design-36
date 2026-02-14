"use client"

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
} from "@/components/ui/sidebar"
import { useTenant, canAccessRoute, ROLE_LABELS } from "@/lib/tenant-context"
import { Badge } from "@/components/ui/badge"

const navigation = [
  {
    title: "General",
    items: [
      { title: "Tableau de bord", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Stocks", href: "/stocks", icon: Package },
      { title: "Inventaire", href: "/inventaire", icon: ClipboardCheck },
      { title: "Production", href: "/production", icon: ChefHat },
      { title: "Commandes", href: "/commandes", icon: ShoppingCart },
    ],
  },
  {
    title: "Achats",
    items: [
      { title: "Approvisionnement", href: "/approvisionnement", icon: Truck },
    ],
  },
  {
    title: "Ventes en ligne",
    items: [
      { title: "E-Boutique", href: "/boutique", icon: Store },
      { title: "Canaux de vente", href: "/canaux", icon: Radio },
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Tresorerie", href: "/tresorerie", icon: Wallet },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Parametres", href: "/parametres", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentTenant, currentUser, currentRole } = useTenant()

  // Filter navigation groups based on user role
  const filteredNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessRoute(currentRole, item.href)),
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
                      <Link href={item.href}>
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
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {currentUser.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{currentUser.name}</span>
                <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[currentRole]}</span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Deconnexion">
              <LogOut className="h-4 w-4" />
              <span>Deconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
