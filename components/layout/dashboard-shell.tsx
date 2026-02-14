"use client"

import { AppShell } from "./app-shell"
import { RouteGuard } from "@/components/route-guard"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RouteGuard>{children}</RouteGuard>
    </AppShell>
  )
}
