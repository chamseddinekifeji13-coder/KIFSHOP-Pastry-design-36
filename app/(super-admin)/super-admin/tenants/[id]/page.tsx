import { TenantDetailView } from "@/components/super-admin/tenant-detail"

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="p-6">
      <TenantDetailView tenantId={id} />
    </div>
  )
}
