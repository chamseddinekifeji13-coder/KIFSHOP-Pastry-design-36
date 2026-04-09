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
export type UserRole = "gerant" | "vendeur" | "magasinier" | "achat" | "caissier" | "patissier" | "emballeur" | "livreur" | "owner"

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Proprietaire",
  gerant: "Gerant",
  vendeur: "Vendeur",
  magasinier: "Magasinier",
  achat: "Achat",
  caissier: "Caissier",
  patissier: "Patissier",
  emballeur: "Emballeur",
  livreur: "Livreur",
}

export const ALL_ROLES: UserRole[] = ["owner", "gerant", "vendeur", "magasinier", "achat", "caissier", "patissier", "emballeur", "livreur"]

// ─── Route access per role ────────────────────────────────────
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  owner: ["/dashboard", "/commandes", "/clients", "/canaux", "/stocks", "/inventaire", "/approvisionnement", "/workflow", "/tresorerie", "/pos80", "/production", "/boutique", "/prospects", "/performance", "/campagnes", "/parametres", "/support"],
  gerant: ["/dashboard", "/commandes", "/clients", "/canaux", "/stocks", "/inventaire", "/approvisionnement", "/workflow", "/tresorerie", "/pos80", "/production", "/boutique", "/prospects", "/performance", "/campagnes", "/parametres", "/support"],
  vendeur: ["/commandes", "/clients", "/canaux", "/prospects", "/support"],
  magasinier: ["/stocks", "/inventaire", "/workflow", "/support"],
  achat: ["/approvisionnement", "/workflow", "/support"],
  caissier: ["/tresorerie", "/treasury/courier-collections", "/treasury/pos80-sync", "/pos80", "/support"],
  patissier: ["/production", "/support"],
  emballeur: ["/packer", "/support"],
  livreur: ["/livraison", "/support"],
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
  dbId?: string   // tenant_users.id for DB operations
  pin?: string    // PIN code for employee access
}

// ─── Subscription ─────────────────────────────────────────────
export interface TenantSubscription {
  status: "trial" | "active" | "expired" | "suspended"
  plan: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  maxSalesChannels: number
  maxWarehouses: number
  maxUsers: number
}

// ─── Tenant ───────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  logo: string
  logoUrl?: string
  primaryColor: string
  subscription: TenantSubscription
  address?: string
  phone?: string
}

export interface TenantState {
  currentTenant: Tenant
  currentUser: AppUser
  currentRole: UserRole
  users: AppUser[]
  tenants: Tenant[]
  authUser: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean // New: true if user is authenticated with Supabase Auth
  isSuspended: boolean
  isTrialExpired: boolean
  trialDaysLeft: number
  setCurrentTenant: (tenant: Tenant) => void
  setCurrentUser: (user: AppUser) => void
  addUser: (user: Omit<AppUser, "id">) => void
  updateUser: (id: string, updates: Partial<Omit<AppUser, "id">>) => void
  removeUser: (id: string) => void
  reloadUsers: () => Promise<void>
  signOut: () => Promise<void>
}

// ─── Fallback data for offline / demo ─────────────────────────
const FALLBACK_TENANT: Tenant = {
  id: "__fallback__",
  name: "Mode Demo",
  logo: "D",
  primaryColor: "#4A7C59",
  subscription: {
    status: "trial",
    plan: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    maxSalesChannels: 1,
    maxWarehouses: 1,
    maxUsers: 3,
  },
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
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null)
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

        // Fetch tenant and team members in parallel to reduce initial load latency.
        const [{ data: tenantData }, { data: teamMembers }] = await Promise.all([
          supabase
            .from("tenants")
            .select("*")
            .eq("id", tenantUser.tenant_id)
            .single(),
          supabase
            .from("tenant_users")
            .select("id, user_id, role, display_name, pin")
            .eq("tenant_id", tenantUser.tenant_id)
            .order("created_at", { ascending: true }),
        ])

        if (tenantData) {
          // Get subscription with plan limits
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("status, trial_ends_at, current_period_end, plan_id")
            .eq("tenant_id", tenantData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          let planLimits = { maxSalesChannels: 1, maxWarehouses: 1, maxUsers: 3 }
          if (subData?.plan_id) {
            const { data: planData } = await supabase
              .from("subscription_plans")
              .select("max_sales_channels, max_warehouses, max_users")
              .eq("id", subData.plan_id)
              .single()
            if (planData) {
              planLimits = {
                maxSalesChannels: planData.max_sales_channels,
                maxWarehouses: planData.max_warehouses,
                maxUsers: planData.max_users,
              }
            }
          }

          const tenant: Tenant = {
            id: tenantData.id,
            name: tenantData.name,
            logo: tenantData.name.charAt(0).toUpperCase(),
            primaryColor: tenantData.primary_color || "#4A7C59",
            subscription: {
              status: (subData?.status as TenantSubscription["status"]) || (tenantData.subscription_status as TenantSubscription["status"]) || "trial",
              plan: tenantData.subscription_plan || null,
              trialEndsAt: subData?.trial_ends_at || tenantData.trial_ends_at || null,
              currentPeriodEnd: subData?.current_period_end || null,
              ...planLimits,
            },
          }
          setCurrentTenant(tenant)
          setTenants([tenant])
          setActiveTenantId(tenantData.id)
        }

        // Build AppUser from Supabase data (the auth user = owner)
        const displayName = tenantUser.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur"
        const appUser: AppUser = {
          id: user.id,
          name: displayName,
          role: (tenantUser.role as UserRole) || "gerant",
          initials: getInitials(displayName),
          email: user.email,
        }
        // Don't set currentUser here yet — we need to check the active profile cookie first
        // to avoid overwriting an employee's session with the owner profile

        if (teamMembers && teamMembers.length > 0) {
          const allUsers: AppUser[] = teamMembers.map((m) => {
            const name = m.display_name || "Utilisateur"
            return {
              id: m.id, // Use tenant_users.id as unique identifier (supports multi-profiles)
              name,
              role: (m.role as UserRole) || "vendeur",
              initials: getInitials(name),
              dbId: m.id,
              pin: m.pin || undefined,
            }
          })
          setUsers(allUsers)

          const setOwnerProfile = () => {
            const ownerProfile = allUsers.find((u) => u.role === "owner")
            if (ownerProfile && appUser.role === "owner") {
              setCurrentUser({ ...appUser, id: ownerProfile.id, dbId: ownerProfile.dbId })
              return
            }
            // Fallback to first available profile when owner is not found.
            setCurrentUser(allUsers[0])
          }

          // Avoid extra session API call for single-profile tenants.
          const shouldTrySessionRestore =
            allUsers.length > 1 || allUsers.some((u) => Boolean(u.pin))

          if (!shouldTrySessionRestore) {
            setOwnerProfile()
          } else {
            // Check if there's an active profile cookie (set by PIN verification)
            // This restores the correct employee profile after page reload.
            try {
              const sessionRes = await fetch("/api/session")
              if (sessionRes.ok) {
                const sessionData = await sessionRes.json()
                if (sessionData.activeProfileId) {
                  const activeUser = allUsers.find((u) => u.id === sessionData.activeProfileId)
                  if (activeUser) {
                    setCurrentUser(activeUser)
                  } else {
                    setOwnerProfile()
                  }
                } else {
                  setOwnerProfile()
                }
              } else {
                setOwnerProfile()
              }
            } catch {
              setOwnerProfile()
            }
          }
        } else {
          // No team members found, use only the owner
          setUsers([appUser])
          setCurrentUser(appUser)
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
    setUsers((prev) => {
      // Only remove if it's not the current user
      if (prev.length > 0 && prev[0].id === id) {
        // Don't remove the currently active user
        return prev
      }
      return prev.filter((u) => u.id !== id)
    })
  }, [])

  const reloadUsers = useCallback(async () => {
    if (!activeTenantId) return
    const supabase = createClient()
    const { data: teamMembers } = await supabase
      .from("tenant_users")
      .select("id, user_id, role, display_name, pin")
      .eq("tenant_id", activeTenantId)
      .order("created_at", { ascending: true })

    if (teamMembers && teamMembers.length > 0) {
      const allUsers: AppUser[] = teamMembers.map((m) => {
        const name = m.display_name || "Utilisateur"
        return {
          id: m.id, // Use tenant_users.id as unique identifier
          name,
          role: (m.role as UserRole) || "vendeur",
          initials: getInitials(name),
          dbId: m.id,
          pin: m.pin || undefined,
        }
      })
      setUsers(allUsers)
    }
  }, [activeTenantId])

  // Compute subscription state
  const sub = currentTenant.subscription
  const isSuspended = sub.status === "suspended"
  const isTrialExpired = sub.status === "trial" && sub.trialEndsAt
    ? new Date(sub.trialEndsAt) < new Date()
    : false
  const trialDaysLeft = sub.status === "trial" && sub.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  // Check if user is authenticated with Supabase Auth
  const isAuthenticated = authUser !== null

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
        isAuthenticated,
        isSuspended,
        isTrialExpired,
        trialDaysLeft,
        setCurrentTenant,
        setCurrentUser,
        addUser,
        updateUser,
        removeUser,
        reloadUsers,
        signOut,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

// Default state returned during SSR prerendering when TenantProvider is not yet mounted
const SSR_FALLBACK: TenantState = {
  currentTenant: FALLBACK_TENANT,
  currentUser: FALLBACK_USER,
  currentRole: FALLBACK_USER.role,
  users: [FALLBACK_USER],
  tenants: [FALLBACK_TENANT],
  authUser: null,
  isLoading: true,
  isAuthenticated: false,
  isSuspended: false,
  isTrialExpired: false,
  trialDaysLeft: 0,
  setCurrentTenant: () => {
    // Placeholder for SSR
  },
  setCurrentUser: () => {
    // Placeholder for SSR
  },
  addUser: () => {
    // Placeholder for SSR
  },
  updateUser: () => {
    // Placeholder for SSR
  },
  removeUser: () => {
    // Placeholder for SSR
  },
  reloadUsers: async () => {
    // Placeholder for SSR
  },
  signOut: async () => {
    // Placeholder for SSR
  },
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    // During SSR/prerendering, return a safe fallback with isLoading: true
    // This prevents build errors while the loading state is handled by AppShellContent
    if (typeof window === "undefined") {
      return SSR_FALLBACK
    }
    throw new Error("useTenant must be used within a TenantProvider")
  }
  return context
}
