"use client"

import React, { useState, useEffect } from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TenantProvider, useTenant } from "@/lib/tenant-context"
import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"
import { Toaster } from "@/components/ui/sonner"
import { SubscriptionBanner } from "./subscription-banner"
import { SuspensionOverlay } from "./suspension-overlay"
import { LockScreen } from "@/components/lock-screen"

interface AppShellProps {
  children: React.ReactNode
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { isLoading, users } = useTenant()
  // null = not yet determined, true = locked, false = unlocked
  const [lockState, setLockState] = useState<null | boolean>(null)

  // Determine lock state AFTER loading is complete and users are available
  useEffect(() => {
    if (isLoading) return
    if (lockState !== null) return // already determined

    const hasEmployeesWithPin = users.some((u) => u.pin)
    const shouldShowLock = hasEmployeesWithPin && users.length > 1

    if (!shouldShowLock) {
      // No employees with PIN, skip lock screen
      setLockState(false)
      return
    }

    // Check if already unlocked this browser session
    const unlocked = sessionStorage.getItem("kifshop_unlocked")
    if (unlocked === "true") {
      setLockState(false)
    } else {
      setLockState(true)
    }
  }, [isLoading, users, lockState])

  function handleUnlock() {
    setLockState(false)
    sessionStorage.setItem("kifshop_unlocked", "true")
  }

  // Still loading data or determining lock state
  if (isLoading || lockState === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (lockState === true) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  return (
    <>
      <SuspensionOverlay />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SubscriptionBanner />
          <Topbar />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
        <Toaster position="top-right" />
      </SidebarProvider>
    </>
  )
}

export function AppShell({ children }: AppShellProps) {
  return (
    <TenantProvider>
      <AppShellContent>{children}</AppShellContent>
    </TenantProvider>
  )
}
