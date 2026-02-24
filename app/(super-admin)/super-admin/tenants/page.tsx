import { TenantsList } from "@/components/super-admin/tenants-list"
import { TenantGrid } from "@/components/super-admin/tenant-grid"

const TENANT_GRID_DATA = [
  { name: "Patisserie El-Felah", mrr: 49, orders: 120, risk: "low" as const },
  { name: "Sucre d'Or", mrr: 0, orders: 5, risk: "high" as const },
]

export default function TenantsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Patisseries</h1>
        <p className="text-sm text-muted-foreground">
          Gerer toutes les patisseries inscrites sur KIFSHOP
        </p>
      </div>
      <div className="mb-6">
        <TenantGrid data={TENANT_GRID_DATA} />
      </div>
      <TenantsList />
    </div>
  )
}
