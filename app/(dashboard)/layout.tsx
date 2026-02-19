"use client"

import { AppShell } from "@/components/layout/app-shell"
import { RouteGuard } from "@/components/route-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <RouteGuard>{children}</RouteGuard>
    </AppShell>
  )
}
