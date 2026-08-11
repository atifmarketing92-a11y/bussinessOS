import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  const user = await requireUser();

  // Already onboarded? Straight to the dashboard.
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
          Welcome to Business OS
        </h1>
        <p className="mb-8 text-center text-muted-foreground">
          Let&apos;s set up your business — it takes under two minutes.
        </p>
        <OnboardingWizard />
      </div>
    </div>
  );
}
