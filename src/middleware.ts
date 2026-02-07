import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();

  const protectedPaths = [
    "/lobby",
    "/wallet",
    "/games",
    "/profile",
    "/promos",
    "/affiliates",
    "/tournaments",
    "/support",
    "/legal",
  ];

  const isProtected = protectedPaths.some((p) => url.pathname.startsWith(p));

  if (!session && isProtected) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && (url.pathname === "/login" || url.pathname === "/signup")) {
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/lobby/:path*",
    "/wallet/:path*",
    "/games/:path*",
    "/profile/:path*",
    "/promos/:path*",
    "/affiliates/:path*",
    "/tournaments/:path*",
    "/support/:path*",
    "/legal/:path*",
    "/login",
    "/signup",
  ],
};