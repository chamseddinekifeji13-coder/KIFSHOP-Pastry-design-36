import { Suspense } from "react"
import { AgentPerformanceView } from "@/components/clients/agent-performance-view"

export default function PerformancePage() {
  return (
    <Suspense>
      <AgentPerformanceView />
    </Suspense>
  )
}
