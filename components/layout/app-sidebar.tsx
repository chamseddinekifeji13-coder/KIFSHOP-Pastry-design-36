"use client"

import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Shield,
  User,
  ClipboardCheck,
  Store,
  Radio,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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
import { useTenant } from "@/lib/tenant-context"
import { Badge } from "@/components/ui/badge"

const navigation = [
  {
    title: "Général",
    items: [
      { title: "Tableau de bord", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Opérations",
    items: [
      { title: "Stocks", href: "/stocks", icon: Package },
      { title: "Inventaire", href: "/inventaire", icon: ClipboardCheck },
      { title: "Production", href: "/production", icon: ChefHat },
      { title: "Commandes", href: "/commandes", icon: ShoppingCart },
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
      { title: "Trésorerie", href: "/tresorerie", icon: Wallet },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Paramètres", href: "/parametres", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentTenant, currentRole } = useTenant()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

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
            <Badge
              variant={currentRole === "admin" ? "default" : "secondary"}
              className="mt-1 w-fit text-[10px] px-1.5 py-0"
            >
              {currentRole === "admin" ? (
                <>
                  <Shield className="mr-1 h-2.5 w-2.5" />
                  Admin
                </>
              ) : (
                <>
                  <User className="mr-1 h-2.5 w-2.5" />
                  Staff
                </>
              )}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navigation.map((group) => (
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
            <SidebarMenuButton tooltip="Déconnexion" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
