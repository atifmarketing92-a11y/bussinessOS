import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { requireBusiness } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated application shell.
 *
 * `requireBusiness()` is the real guard here: it validates the session
 * against Supabase and loads the user's business (RLS-enforced), redirecting
 * to /login or /onboarding when either is missing.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, business } = await requireBusiness();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name?.trim() || user.email || "Account";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <Sidebar businessName={business.name} />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <MobileNav businessName={business.name} />
            <span className="font-semibold tracking-tight md:hidden">Business OS</span>
          </div>
          <UserMenu displayName={displayName} email={user.email ?? ""} />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
