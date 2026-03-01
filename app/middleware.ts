import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const adminPaths = ["/admin"];
  if (adminPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };