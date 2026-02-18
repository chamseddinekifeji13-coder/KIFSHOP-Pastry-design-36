"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
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

async function getAuthUserTenantId(): Promise<{ supabase: ReturnType<Awaited<ReturnType<typeof createClient>>>; tenantId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifie")

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (!tenantUser) throw new Error("Aucun tenant associe")

  // Only owner or gerant can manage employees
  if (!["owner", "gerant"].includes(tenantUser.role)) {
    throw new Error("Acces refuse: seul le proprietaire ou le gerant peut gerer les employes")
  }

  return { supabase: supabase as ReturnType<Awaited<ReturnType<typeof createClient>>>, tenantId: tenantUser.tenant_id }
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
  const { tenantId } = await getAuthUserTenantId()
  const supabase = await createClient()
  const admin = createAdminClient()

  // Don't allow removing the current user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: target } = await admin
    .from("tenant_users")
    .select("user_id")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .single()

  if (target && user && target.user_id === user.id) {
    throw new Error("Impossible de supprimer votre propre compte")
  }

  const { error } = await admin
    .from("tenant_users")
    .delete()
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)

  if (error) throw new Error(error.message)
}
