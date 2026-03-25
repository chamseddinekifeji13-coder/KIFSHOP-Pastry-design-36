import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

  try {
    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options })
              request.cookies.set(name, value)
            })
          },
        },
      },
    )

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: If you remove getUser() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Apply all cookies to response at once (after all operations complete)
    cookiesToSet.forEach(({ name, value, options }) => {
      supabaseResponse.cookies.set(name, value, options)
    })

    const pathname = request.nextUrl.pathname
    const isAuthRoute = pathname.startsWith('/auth')
    const isSuperAdminRoute = pathname.startsWith('/super-admin')
    const isApiRoute = pathname.startsWith('/api')
    const isRootPage = pathname === '/'
    const isDownloadPage = pathname.startsWith('/download')
    const isStorefrontRoute = pathname.startsWith('/store')
    const isPublicRoute = isAuthRoute || isApiRoute || isRootPage || isDownloadPage || isStorefrontRoute

    // Redirect unauthenticated users to login (except public routes)
    // Root page (/) is public because it needs to handle Supabase auth hash
    // fragments (#access_token=...&type=recovery) which are not visible to
    // the server. The root page handles client-side redirect logic.
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      const response = NextResponse.redirect(url)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }

    // Protect super-admin routes
    if (user && isSuperAdminRoute) {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (!isSuperAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const response = NextResponse.redirect(url)
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        return response
      }
    }

    // Redirect super admins away from tenant dashboard to super-admin panel
    if (user && pathname.startsWith('/dashboard')) {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      if (isSuperAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/super-admin'
        const response = NextResponse.redirect(url)
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        return response
      }
    }

    // Redirect logged-in users away from auth pages (except reset-password)
    const isResetPasswordRoute = pathname === '/auth/reset-password'
    if (user && isAuthRoute && !isResetPasswordRoute) {
      const url = request.nextUrl.clone()
      const isSuperAdmin = user.user_metadata?.is_super_admin === true
      url.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
      const response = NextResponse.redirect(url)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware Error]', error)
    // Return a response even if there's an error, ensuring cookies are set
    return supabaseResponse
  }
}
