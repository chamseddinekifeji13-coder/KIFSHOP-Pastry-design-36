import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Single response object - never create multiple
  const response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Apply cookies to the single response object
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options)
            }
          },
        },
      },
    )

    // Get user for auth checks
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isAuthRoute = pathname.startsWith('/auth')
    const isSuperAdminRoute = pathname.startsWith('/super-admin')
    const isApiRoute = pathname.startsWith('/api')
    const isPublicRoute = pathname === '/' || isAuthRoute || isApiRoute || pathname.startsWith('/download') || pathname.startsWith('/store')

    // Redirect unauthenticated users to login
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from auth pages
    if (user && isAuthRoute && pathname !== '/auth/reset-password') {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      const url = request.nextUrl.clone()
      url.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
      return NextResponse.redirect(url)
    }

    // Protect super-admin routes
    if (user && isSuperAdminRoute) {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (!isSuperAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // Redirect super admins from dashboard
    if (user && pathname === '/dashboard') {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (isSuperAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/super-admin'
        return NextResponse.redirect(url)
      }
    }

    return response
  } catch (error) {
    console.error('[Proxy Error]', error)
    return response
  }
}
