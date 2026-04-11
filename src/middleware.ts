import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url;
}

function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    null
  );
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set({ name, value, ...options });
        });

        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    "/admin",
  ];

  const isProtected = protectedPaths.some((p) => url.pathname.startsWith(p));

  if (!user && isProtected) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (url.pathname === "/login" || url.pathname === "/signup" || url.pathname === "/")) {
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)"],
};