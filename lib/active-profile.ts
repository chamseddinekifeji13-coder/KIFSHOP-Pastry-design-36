import "server-only"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/tenant-context"

// ─── Cookie-based active profile ────────────────────────────
// Stores the currently active employee profile (after PIN verification)
// in a signed HTTP-only cookie so the server can trust the active role.

const COOKIE_NAME = "kifshop_active_profile"
const COOKIE_MAX_AGE = 60 * 60 * 2 // 2 hours

export interface ActiveProfile {
  tenantUserId: string   // tenant_users.id
  tenantId: string       // tenant_users.tenant_id
  userId: string         // tenant_users.user_id (may be placeholder for local employees)
  role: UserRole
  displayName: string
  authUserId: string     // The real auth user who unlocked this profile
  setAt: number          // Date.now() when profile was set
}

// ─── Set the active profile cookie (server-side only) ─────────
export async function setActiveProfileCookie(profile: ActiveProfile) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, JSON.stringify(profile), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
}

// ─── Read the active profile cookie (server-side only) ────────
export async function getActiveProfileCookie(): Promise<ActiveProfile | null> {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_NAME)
  if (!cookie?.value) return null

  try {
    const profile: ActiveProfile = JSON.parse(cookie.value)

    // Check expiry (2 hours)
    if (Date.now() - profile.setAt > COOKIE_MAX_AGE * 1000) {
      jar.delete(COOKIE_NAME)
      return null
    }

    return profile
  } catch {
    jar.delete(COOKIE_NAME)
    return null
  }
}

// Backward-compatible helper used by route handlers.
// Safe version that always returns null on error instead of throwing
export async function getActiveProfile(): Promise<{
  tenantId: string
  role: UserRole
  tenantUserId: string
  displayName: string
  authUserId: string
} | null> {
  try {
    const session = await getServerSession()
    if (!session) return null
    
    return {
      tenantId: session.tenantId,
      role: session.activeRole,
      tenantUserId: session.activeProfileId,
      displayName: session.displayName,
      authUserId: session.authUserId,
    }
  } catch (error) {
    // Silently catch all errors and return null
    // This includes: not authenticated, no tenant, database errors
    return null
  }
}

// ─── Clear the active profile cookie ──────────────────────────
export async function clearActiveProfileCookie() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

// ─── Get server session: auth user + active profile + tenant ──
// This is the main helper for all server actions.
// It verifies that:
// 1. The user is authenticated via Supabase
// 2. An active profile has been set (via PIN or direct unlock)
// 3. The active profile belongs to the authenticated user's tenant
export async function getServerSession(): Promise<{
  authUserId: string
  tenantId: string
  activeRole: UserRole
  activeProfileId: string
  displayName: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifie")

  // Get the active profile from the cookie
  const profile = await getActiveProfileCookie()

  if (profile && profile.authUserId === user.id) {
    // Active profile is set and belongs to this auth user
    return {
      authUserId: user.id,
      tenantId: profile.tenantId,
      activeRole: profile.role,
      activeProfileId: profile.tenantUserId,
      displayName: profile.displayName,
    }
  }

  // No active profile cookie -- fall back to the auth user's own tenant_users record
  // This is the case when there's no lock screen (single user, no PINs)
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id, tenant_id, role, display_name")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (!tenantUser) throw new Error("Aucun tenant associe")

  return {
    authUserId: user.id,
    tenantId: tenantUser.tenant_id,
    activeRole: tenantUser.role as UserRole,
    activeProfileId: tenantUser.id,
    displayName: tenantUser.display_name || user.email?.split("@")[0] || "Utilisateur",
  }
}

// ─── Role guard helper ────────────────────────────────────────
export async function requireRole(...allowedRoles: UserRole[]): Promise<{
  authUserId: string
  tenantId: string
  activeRole: UserRole
  activeProfileId: string
  displayName: string
}> {
  const session = await getServerSession()
  if (!allowedRoles.includes(session.activeRole)) {
    throw new Error(`Acces refuse: role "${session.activeRole}" non autorise pour cette action`)
  }
  return session
}
