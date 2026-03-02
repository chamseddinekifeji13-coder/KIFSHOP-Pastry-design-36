"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { requireRole, getServerSession } from "@/lib/active-profile"
import type { UserRole } from "@/lib/tenant-context"

export interface Employee {
  id: string
  tenant_id: string
  user_id: string
  display_name: string
  role: UserRole
  pin: string | null
  created_at: string
}

// ─── Update own PIN (any employee can change their own) ───────

export async function updateOwnPin(data: {
  currentPin?: string
  newPin: string
  /** When true, skip current PIN verification (first-time setup) */
  isFirstTime?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession()
    const admin = createAdminClient()

    // Fetch the current profile to verify the old PIN
    const { data: profile, error: fetchErr } = await admin
      .from("tenant_users")
      .select("id, pin")
      .eq("id", session.activeProfileId)
      .single()

    if (fetchErr || !profile) {
      return { success: false, error: "Profil introuvable" }
    }

    // If user already has a PIN AND this is not a first-time setup, verify old PIN
    if (profile.pin && !data.isFirstTime) {
      if (!data.currentPin) return { success: false, error: "Le PIN actuel est requis" }
      if (data.currentPin !== profile.pin) return { success: false, error: "PIN actuel incorrect" }
    }

    // Validate new PIN format (4 digits)
    if (!/^\d{4}$/.test(data.newPin)) {
      return { success: false, error: "Le nouveau PIN doit contenir exactement 4 chiffres" }
    }

    // Update the PIN (trim to avoid whitespace issues)
    const { error: updateErr } = await admin
      .from("tenant_users")
      .update({ pin: String(data.newPin).trim() })
      .eq("id", session.activeProfileId)

    if (updateErr) {
      return { success: false, error: "Erreur lors de la sauvegarde du PIN" }
    }

    return { success: true }
  } catch (err) {
    console.error("updateOwnPin error:", err)
    return { success: false, error: "Erreur serveur lors de la modification du PIN" }
  }
}

// ─── Helpers ──────────────────────────────────────────────────

async function getAuthUserTenantId() {
  // Only owner or gerant can manage employees -- verified server-side
  const session = await requireRole("owner", "gerant")
  return { tenantId: session.tenantId }
}

// ─── Fetch all employees for current tenant ───────────────────

export async function fetchEmployees(): Promise<Employee[]> {
  const { tenantId } = await getAuthUserTenantId()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("tenant_users")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as Employee[]
}

// ─── Add a new employee (local profile, no auth account) ──────

export async function addEmployee(data: {
  display_name: string
  role: UserRole
  pin?: string
}): Promise<Employee> {
  const { tenantId } = await getAuthUserTenantId()
  const admin = createAdminClient()

  // Generate a placeholder user_id for local employees (no auth account)
  const placeholderUserId = crypto.randomUUID()

  const { data: newEmployee, error } = await admin
    .from("tenant_users")
    .insert({
      tenant_id: tenantId,
      user_id: placeholderUserId,
      display_name: data.display_name,
      role: data.role,
      pin: data.pin ? String(data.pin).trim() : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return newEmployee as Employee
}

// ─── Add additional profile (second role) to existing employee ─

export async function addProfileToEmployee(data: {
  sourceEmployeeDbId: string
  role: UserRole
  pin?: string
}): Promise<Employee> {
  const { tenantId } = await getAuthUserTenantId()
  const admin = createAdminClient()

  // Get the source employee to copy their user_id and display_name
  const { data: source, error: srcErr } = await admin
    .from("tenant_users")
    .select("user_id, display_name")
    .eq("id", data.sourceEmployeeDbId)
    .eq("tenant_id", tenantId)
    .single()

  if (srcErr || !source) throw new Error("Employe introuvable")

  // Check they don't already have this role
  const { data: existing } = await admin
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", source.user_id)
    .eq("role", data.role)
    .limit(1)
    .single()

  if (existing) throw new Error(`Cet employe a deja le profil ${data.role}`)

  // Prevent adding owner role
  if (data.role === "owner") throw new Error("Impossible d'attribuer le role proprietaire")

  const { data: newProfile, error } = await admin
    .from("tenant_users")
    .insert({
      tenant_id: tenantId,
      user_id: source.user_id,
      display_name: source.display_name,
      role: data.role,
      pin: data.pin ? String(data.pin).trim() : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return newProfile as Employee
}

// ─── Update an employee ───────────────────────────────────────

export async function updateEmployee(
  employeeId: string,
  updates: {
    display_name?: string
    role?: UserRole
    pin?: string | null
  }
): Promise<Employee> {
  const { tenantId } = await getAuthUserTenantId()
  const admin = createAdminClient()

  // Prevent changing the owner role or modifying the owner
  const { data: target } = await admin
    .from("tenant_users")
    .select("role")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .single()

  if (target?.role === "owner") {
    throw new Error("Impossible de modifier le compte proprietaire")
  }
  if (updates.role === "owner") {
    throw new Error("Impossible d'attribuer le role proprietaire")
  }

  const { data, error } = await admin
    .from("tenant_users")
    .update(updates)
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Employee
}

// ─── Remove an employee ───────────────────────────────────────

export async function removeEmployee(employeeId: string): Promise<void> {
  const session = await requireRole("owner", "gerant")
  const tenantId = session.tenantId
  const admin = createAdminClient()

  // Don't allow removing the current auth user
  const user = { id: session.authUserId }
  const { data: target } = await admin
    .from("tenant_users")
    .select("user_id")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .single()

  if (target && user && target.user_id === user.id) {
    throw new Error("Impossible de supprimer votre propre compte")
  }

  // Check if target is owner
  const { data: targetRole } = await admin
    .from("tenant_users")
    .select("role")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .single()

  if (targetRole?.role === "owner") {
    throw new Error("Impossible de supprimer le compte proprietaire")
  }

  const { error } = await admin
    .from("tenant_users")
    .delete()
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)

  if (error) throw new Error(error.message)
}
