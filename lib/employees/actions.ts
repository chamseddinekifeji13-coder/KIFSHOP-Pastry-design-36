"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/active-profile"
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

// ─── Helpers ──────────────────────────────────────────────────

async function getAuthUserTenantId() {
  // Only owner or gerant can manage employees -- verified server-side
  const session = await requireRole("owner", "gerant")
  return { tenantId: session.tenantId }
}

// ─── Fetch all employees for current tenant ───────────────────

export async function fetchEmployees(): Promise<Employee[]> {
  const { supabase, tenantId } = await getAuthUserTenantId()

  const { data, error } = await supabase
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
      pin: data.pin || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return newEmployee as Employee
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
