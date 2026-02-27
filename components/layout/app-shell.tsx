"use client"

import React, { useState, useEffect } from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TenantProvider, useTenant } from "@/lib/tenant-context"
import { I18nProvider } from "@/lib/i18n/context"
import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"
import { Toaster } from "@/components/ui/sonner"
import { SubscriptionBanner } from "./subscription-banner"
import { SuspensionOverlay } from "./suspension-overlay"
import { LockScreen } from "@/components/lock-screen"
import { ChangePinDialog } from "@/components/change-pin-dialog"

interface AppShellProps {
  children: React.ReactNode
}

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { isLoading, users, currentUser, updateUser } = useTenant()
  // null = not yet determined, true = locked, false = unlocked
  const [lockState, setLockState] = useState<null | boolean>(null)
  const hasEmployees = users.length > 1 && users.some((u) => u.pin)

  // Owner must have a PIN — detect if it's missing
  const ownerNeedsPin = !isLoading && currentUser.role === "owner" && !currentUser.pin
  const [forcePinOpen, setForcePinOpen] = useState(false)

  useEffect(() => {
    if (ownerNeedsPin && lockState === false) {
      setForcePinOpen(true)
    }
  }, [ownerNeedsPin, lockState])

  // Determine lock state AFTER loading is complete and users are available
  useEffect(() => {
    if (isLoading) return
    if (lockState !== null) return // already determined

    if (!hasEmployees) {
      setLockState(false)
      return
    }

    // Check if already unlocked this browser session (with timestamp)
    const unlockedAt = sessionStorage.getItem("kifshop_unlocked_at")
    if (unlockedAt && Date.now() - Number(unlockedAt) < INACTIVITY_TIMEOUT_MS) {
      setLockState(false)
    } else {
      sessionStorage.removeItem("kifshop_unlocked_at")
      setLockState(true)
    }
  }, [isLoading, users, lockState, hasEmployees])

  // Auto-lock on inactivity (10 min)
  useEffect(() => {
    if (!hasEmployees || lockState !== false) return

    let timer: ReturnType<typeof setTimeout>

    function resetTimer() {
      clearTimeout(timer)
      sessionStorage.setItem("kifshop_unlocked_at", String(Date.now()))
      timer = setTimeout(() => {
        setLockState(true)
        sessionStorage.removeItem("kifshop_unlocked_at")
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"]
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [hasEmployees, lockState])

  function handleUnlock() {
    setLockState(false)
    sessionStorage.setItem("kifshop_unlocked_at", String(Date.now()))
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
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
        <Toaster position="top-right" />
      </SidebarProvider>

      {/* Force owner to set a PIN if they don't have one */}
      <ChangePinDialog
        open={forcePinOpen}
        onOpenChange={(val) => {
          if (!val) {
            // Always close — the dialog only calls onOpenChange(false)
            // after a successful PIN save in force mode
            setForcePinOpen(false)
          }
        }}
        force
      />
    </>
  )
}

export function AppShell({ children }: AppShellProps) {
  return (
    <I18nProvider>
      <TenantProvider>
        <AppShellContent>{children}</AppShellContent>
      </TenantProvider>
    </I18nProvider>
  )
}
