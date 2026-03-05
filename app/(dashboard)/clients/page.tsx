import { Suspense } from "react"
import { ClientsView } from "@/components/clients/clients-view"

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsView />
    </Suspense>
  )
}
