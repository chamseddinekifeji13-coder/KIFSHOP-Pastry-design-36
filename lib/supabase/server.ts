import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
/**
 * Admin client using service_role key.
 * Only use in server actions that require auth.admin operations
 * (e.g. confirming user emails, updating user metadata).
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url) {
    throw new Error('Missing Supabase URL')
  }
  
  if (!serviceKey) {
    throw new Error('Missing Supabase Service Role Key')
  }
  
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

export async function getTenantIdFromUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: tenantUser, error: tenantError } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (tenantError || !tenantUser?.tenant_id) {
    return null
  }

  return typeof tenantUser.tenant_id === "string"
    ? tenantUser.tenant_id.trim()
    : String(tenantUser.tenant_id)
}
