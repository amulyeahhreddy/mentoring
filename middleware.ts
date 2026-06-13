import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page and static assets
  if (pathname === '/login' || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Get Supabase client for middleware
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: any) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user || authError) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Get user profile to check role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // If profile not found or error, redirect to login
  if (!profile || profileError) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  const userRole = profile.role

  // Check if user is accessing the correct route for their role
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/mentor') && userRole !== 'mentor') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/mentee') && userRole !== 'mentee') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Allow access if role matches
  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/mentor/:path*',
    '/mentee/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
