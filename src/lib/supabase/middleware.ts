import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Use getUser() instead of getSession() for secure server validation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isCitizenRoute = pathname === '/citizen' || pathname.startsWith('/citizen/');
  const isOfficialRoute = pathname === '/official' || pathname.startsWith('/official/');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // 1. Unauthenticated user trying to access protected routes -> redirect to /login
  if (!user && (isCitizenRoute || isOfficialRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user handling
  if (user) {
    // Retrieve role from public.profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'citizen';

    // Citizen attempting to access /official -> redirect to /citizen
    if (isOfficialRoute && role === 'citizen') {
      const url = request.nextUrl.clone();
      url.pathname = '/citizen';
      return NextResponse.redirect(url);
    }

    // Official or Admin attempting to access /citizen -> redirect to /official
    if (isCitizenRoute && (role === 'official' || role === 'admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/official';
      return NextResponse.redirect(url);
    }

    // Authenticated user attempting to access /login or /signup -> redirect to dashboard
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'citizen' ? '/citizen' : '/official';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
