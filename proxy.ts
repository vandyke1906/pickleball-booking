import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth-token")?.value

  if (pathname.startsWith("/admin")) {
    // const userRole = request.cookies.get("user-role")?.value
    // if (userRole !== "admin") {
    //   return NextResponse.redirect(new URL("/login", request.url))
    // }
    return NextResponse.next()
  }

  // 2. Protect User Routes (Future-proof)
  // if (pathname.startsWith("/user") )) {
  //   if (!token) {
  //     return NextResponse.redirect(new URL("/login", request.url))
  //   }
  // }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
