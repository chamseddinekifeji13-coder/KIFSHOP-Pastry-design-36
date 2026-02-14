"use client"

import { usePathname } from "next/navigation"
import { useTenant, canAccessRoute } from "@/lib/tenant-context"
import { AccessDenied } from "@/components/access-denied"

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { currentRole } = useTenant()
  const hasAccess = canAccessRoute(currentRole, pathname)

  return hasAccess ? <>{children}</> : <AccessDenied />
}
