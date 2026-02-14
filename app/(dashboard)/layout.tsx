"use client"

import { usePathname } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { AccessDenied } from "@/components/access-denied"
import { useTenant, canAccessRoute } from "@/lib/tenant-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { currentRole } = useTenant()
  const hasAccess = canAccessRoute(currentRole, pathname)

  return (
    <AppShell>
      {hasAccess ? children : <AccessDenied />}
    </AppShell>
  )
}
