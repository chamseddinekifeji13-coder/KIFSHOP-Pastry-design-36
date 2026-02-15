"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Minimal type for Supabase auth user (avoids direct @supabase/supabase-js import)
type AuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

// ─── User Roles ───────────────────────────────────────────────
export type UserRole = "gerant" | "vendeur" | "magasinier" | "achat" | "caissier" | "patissier" | "owner"

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Proprietaire",
  gerant: "Gerant",
  vendeur: "Vendeur",
  magasinier: "Magasinier",
  achat: "Achat",
  caissier: "Caissier",
  patissier: "Patissier",
}

export const ALL_ROLES: UserRole[] = ["owner", "gerant", "vendeur", "magasinier", "achat", "caissier", "patissier"]

// ─── Route access per role ────────────────────────────────────
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  owner: ["/dashboard", "/commandes", "/canaux", "/stocks", "/inventaire", "/approvisionnement", "/tresorerie", "/production", "/boutique", "/parametres"],
  gerant: ["/dashboard", "/commandes", "/canaux", "/stocks", "/inventaire", "/approvisionnement", "/tresorerie", "/production", "/boutique", "/parametres"],
  vendeur: ["/commandes", "/canaux"],
  magasinier: ["/stocks", "/inventaire"],
  achat: ["/approvisionnement"],
  caissier: ["/tresorerie"],
  patissier: ["/production"],
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_ALLOWED_ROUTES[role]
  if (!allowed) return false
  return allowed.some((route) => {
    if (route === "/dashboard") return pathname === "/dashboard" || pathname === "/"
    return pathname === route || pathname.startsWith(route + "/")
  })
}

export function getDefaultRoute(role: UserRole): string {
  return ROLE_ALLOWED_ROUTES[role]?.[0] || "/dashboard"
}

// ─── Multi-user system ────────────────────────────────────────
export interface AppUser {
  id: string
  name: string
  role: UserRole
  initials: string
  email?: string
}

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
  users: AppUser[]
  tenants: Tenant[]
  authUser: AuthUser | null
  isLoading: boolean
  setCurrentTenant: (tenant: Tenant) => void
  setCurrentUser: (user: AppUser) => void
  addUser: (user: Omit<AppUser, "id">) => void
  updateUser: (id: string, updates: Partial<Omit<AppUser, "id">>) => void
  removeUser: (id: string) => void
  signOut: () => Promise<void>
}

// ─── Fallback data for offline / demo ─────────────────────────
const FALLBACK_TENANT: Tenant = {
  id: "demo",
  name: "Mode Demo",
  logo: "D",
  primaryColor: "#4A7C59",
}

const FALLBACK_USER: AppUser = {
  id: "demo-user",
  name: "Utilisateur Demo",
  role: "gerant",
  initials: "UD",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const TenantContext = createContext<TenantState | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [currentTenant, setCurrentTenant] = useState<Tenant>(FALLBACK_TENANT)
  const [users, setUsers] = useState<AppUser[]>([FALLBACK_USER])
  const [currentUser, setCurrentUser] = useState<AppUser>(FALLBACK_USER)
  const [tenants, setTenants] = useState<Tenant[]>([FALLBACK_TENANT])
  const [isLoading, setIsLoading] = useState(true)

  // Load user data from Supabase
  useEffect(() => {
    const supabase = createClient()

    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }
        setAuthUser(user)

        // Get the user's tenant link
        const { data: tenantUser } = await supabase
          .from("tenant_users")
          .select("tenant_id, role, display_name")
          .eq("user_id", user.id)
          .limit(1)
          .single()

        if (!tenantUser) {
          // User exists in auth but no tenant link yet
          setIsLoading(false)
          return
        }

        // Get tenant data
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantUser.tenant_id)
          .single()

        if (tenantData) {
          const tenant: Tenant = {
            id: tenantData.id,
            name: tenantData.name,
            logo: tenantData.name.charAt(0).toUpperCase(),
            primaryColor: tenantData.primary_color || "#4A7C59",
          }
          setCurrentTenant(tenant)
          setTenants([tenant])
        }

        // Build AppUser from Supabase data
        const displayName = tenantUser.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur"
        const appUser: AppUser = {
          id: user.id,
          name: displayName,
          role: (tenantUser.role as UserRole) || "gerant",
          initials: getInitials(displayName),
          email: user.email,
        }
        setCurrentUser(appUser)
        setUsers([appUser])

        // Load all team members for this tenant
        const { data: teamMembers } = await supabase
          .from("tenant_users")
          .select("user_id, role, display_name")
          .eq("tenant_id", tenantUser.tenant_id)

        if (teamMembers && teamMembers.length > 0) {
          const allUsers: AppUser[] = teamMembers.map((m) => {
            const name = m.display_name || "Utilisateur"
            return {
              id: m.user_id,
              name,
              role: (m.role as UserRole) || "vendeur",
              initials: getInitials(name),
            }
          })
          setUsers(allUsers)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthUser(null)
        setCurrentTenant(FALLBACK_TENANT)
        setCurrentUser(FALLBACK_USER)
        setUsers([FALLBACK_USER])
        setTenants([FALLBACK_TENANT])
        router.push("/auth/login")
      }
      if (event === "SIGNED_IN") {
        loadUserData()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }, [])

  const addUser = useCallback((user: Omit<AppUser, "id">) => {
    const newUser: AppUser = { ...user, id: `u${Date.now()}` }
    setUsers((prev) => [...prev, newUser])
  }, [])

  const updateUser = useCallback((id: string, updates: Partial<Omit<AppUser, "id">>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    )
    setCurrentUser((prev) => prev.id === id ? { ...prev, ...updates } : prev)
  }, [])

  const removeUser = useCallback((id: string) => {
    setCurrentUser((current) => {
      if (id === current.id) return current
      setUsers((prev) => prev.filter((u) => u.id !== id))
      return current
    })
  }, [])

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        currentUser,
        currentRole: currentUser.role,
        users,
        tenants,
        authUser,
        isLoading,
        setCurrentTenant,
        setCurrentUser,
        addUser,
        updateUser,
        removeUser,
        signOut,
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
