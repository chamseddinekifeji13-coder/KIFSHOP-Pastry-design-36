import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Start with a response that passes through the request
  let response = NextResponse.next({ request })

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
            // Only set cookies on the response, never on request
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    // Get user without throwing
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user
    } catch {
      // User not authenticated, continue
    }

    const pathname = request.nextUrl.pathname
    const isAuthRoute = pathname.startsWith('/auth')
    const isSuperAdminRoute = pathname.startsWith('/super-admin')
    const isApiRoute = pathname.startsWith('/api')
    const isRootPage = pathname === '/'
    const isDownloadPage = pathname.startsWith('/download')
    const isStorefrontRoute = pathname.startsWith('/store')
    const isPublicRoute = isAuthRoute || isApiRoute || isRootPage || isDownloadPage || isStorefrontRoute

    // Redirect unauthenticated users to login
    if (!user && !isPublicRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      const loginResponse = NextResponse.redirect(loginUrl)
      // Ensure cookies are set on redirect response too
      response.cookies.getAll().forEach(({ name, value, options }) => {
        loginResponse.cookies.set(name, value, options)
      })
      return loginResponse
    }

    // Protect super-admin routes
    if (user && isSuperAdminRoute) {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (!isSuperAdmin) {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = '/dashboard'
        const dashboardResponse = NextResponse.redirect(dashboardUrl)
        response.cookies.getAll().forEach(({ name, value, options }) => {
          dashboardResponse.cookies.set(name, value, options)
        })
        return dashboardResponse
      }
    }

    // Redirect super admins from dashboard to super-admin
    if (user && pathname.startsWith('/dashboard')) {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (isSuperAdmin) {
        const adminUrl = request.nextUrl.clone()
        adminUrl.pathname = '/super-admin'
        const adminResponse = NextResponse.redirect(adminUrl)
        response.cookies.getAll().forEach(({ name, value, options }) => {
          adminResponse.cookies.set(name, value, options)
        })
        return adminResponse
      }
    }

    // Redirect authenticated users away from auth pages
    const isResetPasswordRoute = pathname === '/auth/reset-password'
    if (user && isAuthRoute && !isResetPasswordRoute) {
      const redirectUrl = request.nextUrl.clone()
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      redirectUrl.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options)
      })
      return redirectResponse
    }

    return response
  } catch (error) {
    console.error('[Middleware Error]', error)
    return response
  }
}
