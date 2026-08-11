"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getServerOrigin } from "@/lib/server/auth";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth.schema";
import { type FormState, initialFormState } from "./types";

/** Map Supabase's technical auth errors to plain, friendly messages. */
function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the link.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 8 characters.";
  }
  return "Something went wrong. Please try again.";
}

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/** After sign-in, send users to their dashboard or to onboarding. */
async function redirectAfterAuth(): Promise<never> {
  const supabase = await createClient();
  const { data: membership } = await supabase.from("members").select("id").limit(1).maybeSingle();
  redirect(membership ? "/dashboard" : "/onboarding");
}

export async function signInWithPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  await redirectAfterAuth();
  return initialFormState; // unreachable — redirect() throws
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const origin = await getServerOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  // Supabase returns a user stub with no identities when the email is taken.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "An account with this email already exists. Try signing in." };
  }

  // Email confirmation required → no session yet; tell the user to check email.
  if (!data.session) {
    return {
      ok: true,
      message: "Almost there! Check your email and click the confirmation link to continue.",
    };
  }

  await redirectAfterAuth();
  return initialFormState; // unreachable
}

export async function signInWithMagicLinkAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const origin = await getServerOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  return { ok: true, message: "Check your inbox — we sent you a sign-in link." };
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const origin = await getServerOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  // Same message whether or not the account exists — don't leak account info.
  return {
    ok: true,
    message: "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
