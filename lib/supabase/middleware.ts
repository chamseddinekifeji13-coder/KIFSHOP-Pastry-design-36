import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, let the request pass through
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[v0] Supabase env vars missing, skipping auth middleware')
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isAuthRoute = pathname.startsWith('/auth')
    const isSuperAdminRoute = pathname.startsWith('/super-admin')
    const isApiRoute = pathname.startsWith('/api')
    const isPublicRoute = isAuthRoute || isApiRoute

    // Redirect unauthenticated users to login
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Protect super-admin routes: only users with is_super_admin metadata
    if (user && isSuperAdminRoute) {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (!isSuperAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // If user is logged in and tries to access auth pages, redirect appropriately
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone()
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      url.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
      return NextResponse.redirect(url)
    }
  } catch (e) {
    console.error('[v0] Supabase middleware error:', e)
    // On error, let the request pass through rather than crashing
  }

  return supabaseResponse
}
