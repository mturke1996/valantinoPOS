import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  canAccessPath,
  getDefaultPathForRole,
  type UserRole,
} from "@/config/navigation";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/health",
  "/api/public",
  "/auth/callback",
  "/icon",
  "/catalog",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function withSessionCookies(
  response: NextResponse,
  sessionResponse: NextResponse,
): NextResponse {
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}

function mapProfileRole(roleKey: string | null | undefined): UserRole | null {
  if (!roleKey) return null;
  if (roleKey === "manager") return "admin";
  const allowed: UserRole[] = [
    "cashier",
    "sales",
    "warehouse",
    "accountant",
    "delivery",
  ];
  return allowed.includes(roleKey as UserRole) ? (roleKey as UserRole) : null;
}

async function getSupabaseSession(
  request: NextRequest,
): Promise<{
  authenticated: boolean;
  response: NextResponse;
  userId: string | null;
  supabase: ReturnType<typeof createServerClient> | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });

  if (!url || !key) {
    return { authenticated: false, response, userId: null, supabase: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id ?? null;
    return {
      authenticated: !error && Boolean(userId),
      response,
      userId: userId ?? null,
      supabase,
    };
  } catch {
    return { authenticated: false, response, userId: null, supabase };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSupabaseSession(request);
  const isAuthenticated = session.authenticated;

  if (isPublicPath(pathname)) {
    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
      return withSessionCookies(
        NextResponse.redirect(new URL("/dashboard", request.url)),
        session.response,
      );
    }
    return session.response;
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", `${pathname}${request.nextUrl.search}`);
    return withSessionCookies(NextResponse.redirect(loginUrl), session.response);
  }

  if (pathname.startsWith("/api/")) {
    // Public/health already returned above. Remaining API routes still need an
    // active profile (upload and other handlers may not re-check is_active).
    if (session.supabase && session.userId) {
      const { data: profile } = await session.supabase
        .from("user_profiles")
        .select("role_key, is_active")
        .eq("id", session.userId)
        .maybeSingle();
      if (!profile || profile.is_active === false || !mapProfileRole(profile.role_key)) {
        return withSessionCookies(
          NextResponse.json({ error: "inactive_profile" }, { status: 403 }),
          session.response,
        );
      }
    }
    return session.response;
  }

  let userRole: UserRole | null = null;
  if (session.supabase && session.userId) {
    const { data: profile } = await session.supabase
      .from("user_profiles")
      .select("role_key, is_active")
      .eq("id", session.userId)
      .maybeSingle();
    if (profile && profile.is_active !== false) {
      userRole = mapProfileRole(profile.role_key);
    }
  }

  // Authenticated but no resolvable/active role — deny dashboard access
  if (!userRole) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "inactive_profile");
    return withSessionCookies(
      NextResponse.redirect(loginUrl),
      session.response,
    );
  }

  const accessPath = pathname === "/" ? "/dashboard" : pathname;
  if (!canAccessPath(accessPath, userRole)) {
    const fallback = getDefaultPathForRole(userRole);
    return withSessionCookies(
      NextResponse.redirect(new URL(fallback, request.url)),
      session.response,
    );
  }

  if (pathname === "/dashboard") {
    return withSessionCookies(
      NextResponse.rewrite(new URL("/", request.url)),
      session.response,
    );
  }

  return session.response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
