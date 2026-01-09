import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Crea el cliente de Supabase para middleware
  const supabase = createMiddlewareClient({ req, res });

  // Refresca la sesión si ha expirado
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();

  // 1. Si el usuario NO tiene sesión y trata de entrar a rutas protegidas -> Login
  if (!session && (url.pathname.startsWith("/lobby") || url.pathname.startsWith("/wallet"))) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Si el usuario SÍ tiene sesión y trata de entrar a Auth -> Lobby
  if (session && (url.pathname === "/login" || url.pathname === "/signup")) {
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/lobby/:path*", "/wallet/:path*", "/login", "/signup"],
};