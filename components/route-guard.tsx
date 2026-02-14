"use client"

import { usePathname } from "next/navigation"
import { useTenant, canAccessRoute } from "@/lib/tenant-context"
import { AccessDenied } from "@/components/access-denied"
import { Loader2 } from "lucide-react"

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { currentRole, isLoading } = useTenant()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const hasAccess = canAccessRoute(currentRole, pathname)
  return hasAccess ? <>{children}</> : <AccessDenied />
}
