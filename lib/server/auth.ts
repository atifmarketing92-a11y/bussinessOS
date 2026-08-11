import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Business, Membership } from "@/lib/types";

export interface AuthContext {
  user: User;
  membership: Membership;
  business: Business;
}

/**
 * Returns the authenticated user or redirects to the login page.
 *
 * Uses `auth.getUser()` (a server round-trip that validates the JWT) rather
 * than trusting the session cookie alone.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }
  return user;
}

/**
 * Returns the authenticated user's business or redirects:
 *  - to /login when not signed in
 *  - to /onboarding when signed in but no business exists yet
 *
 * Every Server Action and authenticated Server Component starts here.
 */
export async function requireBusiness(): Promise<AuthContext> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("members")
    .select("id, business_id, user_id, role, created_at, business:businesses(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  // Until generated Database types are introduced, narrow the untyped join result.
  const membership = data as unknown as Membership | null;

  if (!membership || !membership.business) {
    redirect("/onboarding");
  }

  return {
    user,
    membership,
    business: membership.business,
  };
}

/**
 * Canonical public origin for redirect URLs (OAuth / email links).
 * Prefers NEXT_PUBLIC_APP_URL; falls back to the request host in development.
 */
export async function getServerOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  return `http://${host}`;
}
