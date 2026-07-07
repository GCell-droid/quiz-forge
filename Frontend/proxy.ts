import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("jwt")?.value;
  let isAuth = false;
  let role: string | null = null;

  let jwtString = token;
  if (jwtString && jwtString.startsWith("s:")) {
    jwtString = jwtString.slice(2);
    const lastDotIndex = jwtString.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      jwtString = jwtString.slice(0, lastDotIndex);
    }
  }

  if (jwtString) {
    try {
      const payload = decodeJwt(jwtString);
      isAuth = true;
      role = (payload.role as string) || null;
    } catch {
      // Token is malformed — treat as unauthenticated
      isAuth = false;
    }
  }

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  // Unauthenticated users can only access auth pages and the landing page
  if (!isAuth && !isAuthPage && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated users shouldn't see auth pages
  if (isAuth && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Pass role info via headers so layouts can read it
  const response = NextResponse.next();
  if (role) {
    response.headers.set("x-user-role", role);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
