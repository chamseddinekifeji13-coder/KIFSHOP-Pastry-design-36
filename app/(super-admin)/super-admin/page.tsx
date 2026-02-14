import { SuperAdminDashboard } from "@/components/super-admin/super-admin-dashboard"

export default function SuperAdminPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground">
          Vue globale de toutes les patisseries KIFSHOP
        </p>
      </div>
      <SuperAdminDashboard />
    </div>
  )
}
