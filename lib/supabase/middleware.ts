import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/auth')
  const isSuperAdminRoute = pathname.startsWith('/super-admin')
  const isApiRoute = pathname.startsWith('/api')
  const isRootPage = pathname === '/'
  const isPublicRoute = isAuthRoute || isApiRoute || isRootPage

  // Redirect unauthenticated users to login (except public routes)
  // Root page (/) is public because it needs to handle Supabase auth hash
  // fragments (#access_token=...&type=recovery) which are not visible to
  // the server. The root page handles client-side redirect logic.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
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

  // Redirect super admins away from tenant dashboard to super-admin panel
  if (user && pathname.startsWith('/dashboard')) {
    const isSuperAdmin = user.user_metadata?.is_super_admin === true
    if (isSuperAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/super-admin'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages (except reset-password)
  const isResetPasswordRoute = pathname === '/auth/reset-password'
  if (user && isAuthRoute && !isResetPasswordRoute) {
    const url = request.nextUrl.clone()
    const isSuperAdmin = user.user_metadata?.is_super_admin === true
    url.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
