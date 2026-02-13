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

  // Rutas que REQUIEREN estar logueado
  const protectedPaths = [
    "/lobby",
    "/wallet",
    "/profile",
    "/promos",
    "/affiliates",
    "/tournaments",
    "/games", // Protege todos los juegos
  ];

  const isProtected = protectedPaths.some((p) => url.pathname.startsWith(p));

  // Si intenta entrar a ruta protegida sin sesión -> Login
  if (!session && isProtected) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si ya tiene sesión e intenta ir a login/signup -> Lobby
  if (session && (url.pathname === "/login" || url.pathname === "/signup" || url.pathname === "/")) {
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets like images (.png, .jpg)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};