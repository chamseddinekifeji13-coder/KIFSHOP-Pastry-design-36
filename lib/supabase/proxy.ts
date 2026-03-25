import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create ONE response object only - never create multiple
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies ONLY on the response, never modify request
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  try {
    await supabase.auth.getUser()
  } catch (error) {
    console.error('[Auth Error]', error)
  }

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/auth')
  const isSuperAdminRoute = pathname.startsWith('/super-admin')
  const isApiRoute = pathname.startsWith('/api')
  const isRootPage = pathname === '/'
  const isDownloadPage = pathname.startsWith('/download')
  const isStorefrontRoute = pathname.startsWith('/store')
  const isPublicRoute = isAuthRoute || isApiRoute || isRootPage || isDownloadPage || isStorefrontRoute

  // Get user
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch {
    // Not authenticated
  }

  // Redirect unauthenticated users to login
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

  // Redirect super admins from dashboard
  if (user && pathname.startsWith('/dashboard')) {
    const isSuperAdmin = user.user_metadata?.is_super_admin === true
    if (isSuperAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/super-admin'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  const isResetPasswordRoute = pathname === '/auth/reset-password'
  if (user && isAuthRoute && !isResetPasswordRoute) {
    const url = request.nextUrl.clone()
    const isSuperAdmin = user.user_metadata?.is_super_admin === true
    url.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
