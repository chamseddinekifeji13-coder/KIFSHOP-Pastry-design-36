import { Suspense } from "react"
import { CampaignsView } from "@/components/clients/campaigns-view"

export default function CampaignesPage() {
  return (
    <Suspense>
      <CampaignsView />
    </Suspense>
  )
}
