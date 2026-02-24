"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TenantsList } from "@/components/super-admin/tenants-list"
import { TenantGrid } from "@/components/super-admin/tenant-grid"
import { InviteTenantDrawer } from "@/components/super-admin/invite-tenant-drawer"

const TENANT_GRID_DATA = [
  { name: "Patisserie El-Felah", mrr: 49, orders: 120, risk: "low" as const },
  { name: "Sucre d'Or", mrr: 0, orders: 5, risk: "high" as const },
]

export default function TenantsPage() {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patisseries</h1>
          <p className="text-sm text-muted-foreground">
            Gerer toutes les patisseries inscrites sur KIFSHOP
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Send className="h-4 w-4" />
          Inviter
        </Button>
      </div>

      <div className="mb-6">
        <TenantGrid data={TENANT_GRID_DATA} />
      </div>

      <TenantsList />

      <InviteTenantDrawer
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  )
}
