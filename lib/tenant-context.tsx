"use client"

import React, { createContext, useContext, useState, type ReactNode } from "react"

export type UserRole = "admin" | "staff"

export interface Tenant {
  id: string
  name: string
  logo: string
  primaryColor: string
}

export interface TenantState {
  currentTenant: Tenant
  currentRole: UserRole
  tenants: Tenant[]
  setCurrentTenant: (tenant: Tenant) => void
  setCurrentRole: (role: UserRole) => void
}

const tenants: Tenant[] = [
  {
    id: "masmoudi",
    name: "Patisserie Masmoudi",
    logo: "M",
    primaryColor: "#4A7C59",
  },
  {
    id: "delices",
    name: "Délices du Sud",
    logo: "D",
    primaryColor: "#C17817",
  },
]

const TenantContext = createContext<TenantState | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant>(tenants[0])
  const [currentRole, setCurrentRole] = useState<UserRole>("admin")

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        currentRole,
        tenants,
        setCurrentTenant,
        setCurrentRole,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider")
  }
  return context
}
