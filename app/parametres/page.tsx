"use client"

import dynamic from "next/dynamic"

const AppShell = dynamic(() => import("@/components/layout/app-shell").then(m => ({ default: m.AppShell })), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
})

const SettingsView = dynamic(() => import("@/components/settings/settings-view").then(m => ({ default: m.SettingsView })), {
  ssr: false,
})

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  )
}
