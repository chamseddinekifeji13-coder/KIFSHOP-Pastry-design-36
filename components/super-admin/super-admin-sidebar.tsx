"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Shield,
  Loader2,
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
import { Badge } from "@/components/ui/badge"

const navigation = [
  {
    title: "Vue globale",
    items: [
      { title: "Tableau de bord", href: "/super-admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Gestion",
    items: [
      { title: "Patisseries", href: "/super-admin/tenants", icon: Building2 },
      { title: "Utilisateurs", href: "/super-admin/users", icon: Users },
    ],
  },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background font-bold text-lg">
            K
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">
              KIFSHOP
            </span>
            <Badge
              variant="outline"
              className="w-fit mt-1 text-[10px] px-1.5 py-0 border-foreground/30 text-foreground/70"
            >
              <Shield className="mr-1 h-2.5 w-2.5" />
              Super Admin
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
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/super-admin"
                      ? pathname === "/super-admin"
                      : pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Deconnexion"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{signingOut ? "Deconnexion..." : "Deconnexion"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
