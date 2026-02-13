import { StorefrontView } from "@/components/storefront/storefront-view"

interface StorePageProps {
  params: Promise<{ tenant: string }>
}

export default async function StorePage({ params }: StorePageProps) {
  const { tenant } = await params
  return <StorefrontView tenantId={tenant} />
}
