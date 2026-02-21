export async function proxy(request: any) {
  const pathname = new URL(request.url).pathname;

  // Public routes - let through without auth
  const publicPaths = ['/download', '/auth', '/api'];
  const isRootPage = pathname === '/';
  const isPublicRoute = isRootPage || publicPaths.some(p => pathname.startsWith(p));

  if (isPublicRoute) {
    // Still refresh Supabase session cookies for public routes
    const { createServerClient } = await import('@supabase/ssr');
    const { NextResponse } = await import('next/server');
    let response = NextResponse.next({ request });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }: any) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    // Refresh session but don't block
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect logged-in users away from auth pages
    if (user && pathname.startsWith('/auth') && pathname !== '/auth/reset-password') {
      const isSuperAdmin = user.user_metadata?.is_super_admin === true;
      const url = new URL(isSuperAdmin ? '/super-admin' : '/dashboard', request.url);
      return NextResponse.redirect(url);
    }

    return response;
  }

  // Protected routes - require auth
  const { createServerClient } = await import('@supabase/ssr');
  const { NextResponse } = await import('next/server');
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const isSuperAdmin = user.user_metadata?.is_super_admin === true;

  if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/dashboard') && isSuperAdmin) {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons\\/.*|offline\\.html|og-image\\.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
