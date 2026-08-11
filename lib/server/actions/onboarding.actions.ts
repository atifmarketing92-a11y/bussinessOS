"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/server/auth";
import { onboardingSchema } from "@/lib/validators/onboarding.schema";
import type { ActionResult } from "./types";

/** Pre-coercion input shape (form fields arrive as strings). */
type OnboardingFormInput = z.input<typeof onboardingSchema>;

/**
 * Creates the user's business atomically via the `create_business` RPC:
 * business row + owner membership + default expense categories +
 * onboarding flag — all in one security-definer transaction.
 */
export async function completeOnboarding(
  input: OnboardingFormInput,
): Promise<ActionResult<{ businessId: string }>> {
  await requireUser();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: Object.fromEntries(
        Object.entries(z.flattenError(parsed.error).fieldErrors).map(([k, v]) => [
          k,
          v?.filter(Boolean) ?? [],
        ]),
      ),
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc("create_business", {
    p_name: data.name,
    p_currency: data.currency,
    p_country: data.country || null,
    p_timezone: data.timezone,
    p_fiscal_year_start_month: data.fiscalYearStartMonth,
    p_default_tax_rate: data.defaultTaxRate,
    p_address_line1: data.addressLine1 || null,
    p_city: data.city || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
  });

  if (error) {
    if (error.message.includes("already has a business")) {
      redirect("/dashboard");
    }
    return {
      ok: false,
      error: "We couldn't create your business. Please try again.",
    };
  }

  redirect("/dashboard");
}
