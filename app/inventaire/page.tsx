"use client"

import { AppShell } from "@/components/layout/app-shell"
import { InventoryView } from "@/components/inventory/inventory-view"

export default function InventairePage() {
  return (
    <AppShell>
      <InventoryView />
    </AppShell>
  )
}
