import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect back from Supabase Auth (OAuth and email links).
 * Exchanges the PKCE `code` for a session, then routes the user:
 *   - password recovery  → /reset-password
 *   - has a business     → /dashboard
 *   - new user           → /onboarding
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (next.startsWith("/reset-password")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const { data: membership } = await supabase
        .from("members")
        .select("id")
        .limit(1)
        .maybeSingle();

      return NextResponse.redirect(`${origin}${membership ? "/dashboard" : "/onboarding"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=session`);
}
