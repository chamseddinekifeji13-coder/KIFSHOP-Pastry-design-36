"use client"

import React from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TenantProvider } from "@/lib/tenant-context"
import { OnboardingProvider } from "@/lib/onboarding-context"
import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"
import { Toaster } from "@/components/ui/sonner"
import { OnboardingModal } from "@/components/onboarding/onboarding-modal"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <TenantProvider>
      <OnboardingProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Topbar />
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
          <Toaster position="top-right" />
          <OnboardingModal />
        </SidebarProvider>
      </OnboardingProvider>
    </TenantProvider>
  )
}
