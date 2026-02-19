"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { RouteGuard } from "@/components/route-guard"
import { LockScreen } from "@/components/lock-screen"
import { useTenant } from "@/lib/tenant-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, users } = useTenant()
  const [isLocked, setIsLocked] = useState(true)

  // Check if lock screen should be shown
  // Only show if there are multiple users or if employees have PINs
  const hasEmployeesWithPin = users.some((u) => u.pin)
  const shouldShowLock = hasEmployeesWithPin && users.length > 1

  // Check session storage to see if already unlocked this session
  useEffect(() => {
    const unlocked = sessionStorage.getItem("kifshop_unlocked")
    if (unlocked === "true") {
      setIsLocked(false)
    }
  }, [])

  function handleUnlock() {
    setIsLocked(false)
    sessionStorage.setItem("kifshop_unlocked", "true")
  }

  if (isLoading) return null

  if (isLocked && shouldShowLock) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  return (
    <AppShell>
      <RouteGuard>{children}</RouteGuard>
    </AppShell>
  )
}
