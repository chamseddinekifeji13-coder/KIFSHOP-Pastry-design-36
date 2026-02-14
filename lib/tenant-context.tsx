"use client"

import React, { createContext, useContext, useState, type ReactNode } from "react"

// ─── User Roles ───────────────────────────────────────────────
export type UserRole = "gerant" | "vendeur" | "magasinier" | "achat" | "caissier"

export const ROLE_LABELS: Record<UserRole, string> = {
  gerant: "Gerant",
  vendeur: "Vendeur",
  magasinier: "Magasinier",
  achat: "Achat",
  caissier: "Caissier",
}

// ─── Route access per role ────────────────────────────────────
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  gerant: ["/", "/commandes", "/canaux", "/stocks", "/inventaire", "/approvisionnement", "/tresorerie", "/production", "/boutique", "/parametres"],
  vendeur: ["/commandes", "/canaux"],
  magasinier: ["/stocks", "/inventaire"],
  achat: ["/approvisionnement"],
  caissier: ["/tresorerie"],
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_ALLOWED_ROUTES[role]
  return allowed.some((route) => {
    if (route === "/") return pathname === "/"
    return pathname === route || pathname.startsWith(route + "/")
  })
}

export function getDefaultRoute(role: UserRole): string {
  return ROLE_ALLOWED_ROUTES[role][0]
}

// ─── Multi-user system ────────────────────────────────────────
export interface AppUser {
  id: string
  name: string
  role: UserRole
  initials: string
}

export const MOCK_USERS: AppUser[] = [
  { id: "u1", name: "Chamseddine", role: "gerant", initials: "CK" },
  { id: "u2", name: "Fatma", role: "vendeur", initials: "FA" },
  { id: "u3", name: "Sami", role: "vendeur", initials: "SA" },
  { id: "u4", name: "Anis", role: "magasinier", initials: "AN" },
  { id: "u5", name: "Nadia", role: "magasinier", initials: "NA" },
  { id: "u6", name: "Karim", role: "achat", initials: "KA" },
  { id: "u7", name: "Salma", role: "caissier", initials: "SL" },
  { id: "u8", name: "Ines", role: "caissier", initials: "IN" },
]

// ─── Tenant ───────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  logo: string
  primaryColor: string
}

export interface TenantState {
  currentTenant: Tenant
  currentUser: AppUser
  currentRole: UserRole
  tenants: Tenant[]
  setCurrentTenant: (tenant: Tenant) => void
  setCurrentUser: (user: AppUser) => void
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
    name: "Delices du Sud",
    logo: "D",
    primaryColor: "#C17817",
  },
]

const TenantContext = createContext<TenantState | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant>(tenants[0])
  const [currentUser, setCurrentUser] = useState<AppUser>(MOCK_USERS[0])

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        currentUser,
        currentRole: currentUser.role,
        tenants,
        setCurrentTenant,
        setCurrentUser,
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
