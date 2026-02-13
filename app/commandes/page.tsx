import { Suspense } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { OrdersView } from "@/components/orders/orders-view"

export default function OrdersPage() {
  return (
    <AppShell>
      <Suspense>
        <OrdersView />
      </Suspense>
    </AppShell>
  )
}
