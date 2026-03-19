import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res;
  }

  let session = null;
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data } = await supabase.auth.getSession();
    session = data?.session ?? null;
  } catch {
    return res;
  }

  const url = req.nextUrl.clone();

  const protectedPaths = [
    "/lobby",
    "/wallet",
    "/profile",
    "/promos",
    "/affiliates",
    "/tournaments",
    "/games",
    "/vip",
    "/support",
  ];

  const isProtected = protectedPaths.some((p) => url.pathname.startsWith(p));

  if (!session && isProtected) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && (url.pathname === "/login" || url.pathname === "/signup" || url.pathname === "/")) {
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
