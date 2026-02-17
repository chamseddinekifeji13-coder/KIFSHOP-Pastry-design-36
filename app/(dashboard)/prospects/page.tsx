import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { ProspectsView } from "@/components/prospects/prospects-view"

function ProspectsLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function ProspectsPage() {
  return (
    <Suspense fallback={<ProspectsLoading />}>
      <ProspectsView />
    </Suspense>
  )
}
