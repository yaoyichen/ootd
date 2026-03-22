import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/",
  "/api/weather",
  "/_next/",
  "/fonts/",
  "/uploads/",
  "/favicon.ico",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isPublicShowcase(pathname: string, method: string): boolean {
  // GET /api/showcase is public; GET /api/showcase/[id] is public
  // GET /api/showcase/[id]/like is public (for reading like count)
  if (method === "GET" && pathname.match(/^\/api\/showcase(\/[^/]+)?$/)) return true;
  if (method === "GET" && pathname.match(/^\/api\/showcase\/[^/]+\/like$/)) return true;
  // POST /api/showcase/[id]/like is public (anonymous likes)
  if (method === "POST" && pathname.match(/^\/api\/showcase\/[^/]+\/like$/)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (isPublicPath(pathname) || isPublicShowcase(pathname, method)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return handleUnauthorized(request, pathname);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return handleUnauthorized(request, pathname);
  }

  return NextResponse.next();
}

function handleUnauthorized(request: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|uploads/).*)",
  ],
};
