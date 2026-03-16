import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/images") ||
    pathname.startsWith("/audio") ||
    pathname.match(/\.(mp3|png|jpg|jpeg|gif|svg|ico|webp)$/)
  )
    return NextResponse.next()

  // If user is logged in and tries to visit /auth/signin → redirect to /admin
  if (token && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  // If user is not logged in and tries to visit /admin → redirect to /auth/signin
  if (!token && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Otherwise allow request
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/auth/signin"],
}
