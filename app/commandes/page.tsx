"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const AppShell = dynamic(() => import("@/components/layout/app-shell").then(m => ({ default: m.AppShell })), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
})

const OrdersView = dynamic(() => import("@/components/orders/orders-view").then(m => ({ default: m.OrdersView })), {
  ssr: false,
})

export default function OrdersPage() {
  return (
    <AppShell>
      <Suspense>
        <OrdersView />
      </Suspense>
    </AppShell>
  )
}
