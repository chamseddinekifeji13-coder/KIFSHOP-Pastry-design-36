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

const TreasuryView = dynamic(() => import("@/components/treasury/treasury-view").then(m => ({ default: m.TreasuryView })), {
  ssr: false,
})

export default function TreasuryPage() {
  return (
    <AppShell>
      <TreasuryView />
    </AppShell>
  )
}
