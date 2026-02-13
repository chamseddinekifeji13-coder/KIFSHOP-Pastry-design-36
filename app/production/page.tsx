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

const ProductionView = dynamic(() => import("@/components/production/production-view").then(m => ({ default: m.ProductionView })), {
  ssr: false,
})

export default function ProductionPage() {
  return (
    <AppShell>
      <ProductionView />
    </AppShell>
  )
}
