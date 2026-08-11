import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Network boundary guard (Next.js 16 "proxy", formerly middleware).
 *
 * Responsibilities are intentionally narrow — this is a UX guard only:
 *  1. Refresh the Supabase session cookie on every request.
 *  2. Keep signed-out users away from the app, and signed-in users away
 *     from the auth pages.
 *
 * Real authorization ALWAYS happens in Postgres Row Level Security and in
 * the server-side `requireUser()` / `requireBusiness()` guards.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/sales",
  "/products",
  "/customers",
  "/expenses",
  "/invoices",
  "/reports",
  "/settings",
  "/onboarding",
];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match everything except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
