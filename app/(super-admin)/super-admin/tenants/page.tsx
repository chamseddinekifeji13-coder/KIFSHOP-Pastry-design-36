import { TenantsList } from "@/components/super-admin/tenants-list"

export default function TenantsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Patisseries</h1>
        <p className="text-sm text-muted-foreground">
          Gerer toutes les patisseries inscrites sur KIFSHOP
        </p>
      </div>
      <TenantsList />
    </div>
  )
}
