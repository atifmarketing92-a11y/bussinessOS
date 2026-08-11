#!/usr/bin/env node
/**
 * Business OS — Supabase end-to-end verification (Phase 1 scope).
 *
 * Verifies the REAL Supabase integration the app depends on:
 *   - auth triggers (profile auto-creation)
 *   - the create_business onboarding RPC (business + member + categories)
 *   - Row Level Security (cross-tenant isolation, deny-all counters)
 *   - sequential document numbering
 *   - the app's HTTP route guards and authenticated rendering
 *
 * Usage (app must be running, e.g. `npm run dev`):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
 *   APP_URL=http://localhost:3000 \
 *   node scripts/e2e/supabase.test.mjs
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY  — only used to DELETE the three test users
 *                                afterwards. Never printed, never required.
 *
 * NOTE: this script creates three users with clearly-marked
 * `bos-e2e-*@example.com` addresses. Without a service-role key they remain
 * in the Supabase project's auth.users table (safe to delete manually).
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // optional cleanup only
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Provide them as environment variables (see header of this file).",
  );
  process.exit(2);
}

const RUN = Date.now();
const BUSINESS_NAME = `E2E Shop ${RUN}`;
const USERS = {
  owner: { email: `bos-e2e-owner-${RUN}@example.com`, password: `E2e-Pass-${RUN}!x` },
  outsider: { email: `bos-e2e-outsider-${RUN}@example.com`, password: `E2e-Pass-${RUN}!x` },
  newbie: { email: `bos-e2e-newbie-${RUN}@example.com`, password: `E2e-Pass-${RUN}!x` },
};

// ---------------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------------

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, detail: String(err?.message ?? err) });
    console.log(`  FAIL  ${name}\n        ↳ ${err?.message ?? err}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signUp(who) {
  const supabase = client();
  const { data, error } = await supabase.auth.signUp({
    email: who.email,
    password: who.password,
    options: { data: { full_name: `E2E ${who === USERS.owner ? "Owner" : "User"}` } },
  });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  if (!data.session) {
    throw new Error(
      "No session returned — email confirmation is enabled in this Supabase project. " +
        "For automated tests disable it: Authentication → Providers → Email → " +
        "'Confirm email' off (or confirm the users manually and re-run).",
    );
  }
  return data;
}

function sessionCookieUrl(session) {
  // @supabase/ssr stores the session JSON, URL-encoded, in sb-<ref>-auth-token.
  const ref = new URL(SUPABASE_URL).host.split(".")[0];
  return { name: `sb-${ref}-auth-token`, value: encodeURIComponent(JSON.stringify(session)) };
}

async function fetchPage(path, cookie) {
  const res = await fetch(`${APP_URL}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie: `${cookie.name}=${cookie.value}` } : {},
  });
  const body = res.status >= 200 && res.status < 300 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location") ?? "", body };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nBusiness OS E2E — Supabase: ${SUPABASE_URL}`);
  console.log(`Business OS E2E — App:      ${APP_URL}\n`);

  let ownerSession = null;
  let outsiderSession = null;
  let newbieSession = null;
  let businessId = null;
  let ownerUserId = null;

  console.log("Supabase layer — auth & onboarding");

  await test("signup creates an auth user and the profile row (auth trigger)", async () => {
    const data = await signUp(USERS.owner);
    ownerSession = data.session;
    ownerUserId = data.user.id;
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, onboarding_completed")
      .eq("id", ownerUserId)
      .maybeSingle();
    if (error) throw new Error(`profiles select failed: ${error.message}`);
    assert(profile, "profile row was not created by the auth trigger");
    assert(profile.onboarding_completed === false, "onboarding flag should start false");
  });

  await test("sign in again with email + password returns a session", async () => {
    const supabase = client();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: USERS.owner.email,
      password: USERS.owner.password,
    });
    if (error) throw new Error(error.message);
    assert(data.session?.access_token, "no access token in session");
    ownerSession = data.session;
  });

  await test("create_business RPC creates the business atomically", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data, error } = await supabase.rpc("create_business", {
      p_name: BUSINESS_NAME,
      p_currency: "USD",
      p_country: null,
      p_timezone: "UTC",
      p_fiscal_year_start_month: 1,
      p_default_tax_rate: 0,
      p_address_line1: null,
      p_city: null,
      p_phone: null,
      p_email: null,
    });
    if (error) throw new Error(`create_business failed: ${error.message}`);
    assert(typeof data === "string" && data.length > 0, "RPC did not return a business id");
    businessId = data;
  });

  await test("business row has the submitted fields", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, name, currency, created_by")
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    assert(business, "business row not readable by its owner");
    assert(business.name === BUSINESS_NAME, `name mismatch: ${business.name}`);
    assert(business.currency === "USD", `currency mismatch: ${business.currency}`);
    assert(business.created_by === ownerUserId, "created_by mismatch");
  });

  await test("owner membership row exists with role 'owner'", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: membership, error } = await supabase
      .from("members")
      .select("role, business_id")
      .eq("user_id", ownerUserId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    assert(membership, "membership row missing");
    assert(membership.role === "owner", `role is ${membership.role}`);
    assert(membership.business_id === businessId, "membership points at wrong business");
  });

  await test("seven default expense categories were seeded", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: categories, error } = await supabase
      .from("expense_categories")
      .select("name")
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    assert(categories?.length === 7, `expected 7 categories, got ${categories?.length}`);
  });

  await test("profiles.onboarding_completed flipped to true", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", ownerUserId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    assert(profile?.onboarding_completed === true, "onboarding flag not updated");
  });

  console.log("\nSupabase layer — Row Level Security");

  await test("RLS: an outsider cannot read the owner's business", async () => {
    const data2 = await signUp(USERS.outsider);
    outsiderSession = data2.session;
    const supabase = client();
    await supabase.auth.setSession(outsiderSession);
    const { data: rows, error } = await supabase.from("businesses").select("id");
    if (error) throw new Error(error.message);
    assert(rows.length === 0, `outsider can see ${rows.length} business(es)`);
  });

  await test("RLS: an outsider cannot update the owner's business", async () => {
    const supabase = client();
    await supabase.auth.setSession(outsiderSession);
    const { error } = await supabase
      .from("businesses")
      .update({ name: "Hacked" })
      .eq("id", businessId);
    if (error) throw new Error(error.message);
    // PostgREST applies the USING filter: a blocked update affects 0 rows.
    const asOwner = client();
    await asOwner.auth.setSession(ownerSession);
    const { data: business } = await asOwner
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle();
    assert(business?.name === BUSINESS_NAME, `business was modified: ${business?.name}`);
  });

  await test("RLS: an outsider cannot insert themselves into members", async () => {
    const supabase = client();
    await supabase.auth.setSession(outsiderSession);
    const { error } = await supabase.from("members").insert({
      business_id: businessId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      role: "member",
    });
    assert(error, "insert into members unexpectedly succeeded");
    assert(/row-level security|policy/i.test(error.message), `unexpected error: ${error.message}`);
  });

  await test("RLS: counters table is deny-all (even for the owner)", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: rows, error } = await supabase.from("counters").select("kind");
    if (error) throw new Error(error.message);
    assert(rows.length === 0, "counters rows leaked through RLS");
  });

  await test("next_document_number issues S-00001 then S-00002 for a member", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { data: first, error: e1 } = await supabase.rpc("next_document_number", {
      p_business: businessId,
      p_kind: "sale",
    });
    if (e1) throw new Error(e1.message);
    const { data: second, error: e2 } = await supabase.rpc("next_document_number", {
      p_business: businessId,
      p_kind: "sale",
    });
    if (e2) throw new Error(e2.message);
    assert(first === "S-00001", `first number was ${first}`);
    assert(second === "S-00002", `second number was ${second}`);
  });

  await test("next_document_number rejects a non-member", async () => {
    const supabase = client();
    await supabase.auth.setSession(outsiderSession);
    const { error } = await supabase.rpc("next_document_number", {
      p_business: businessId,
      p_kind: "sale",
    });
    assert(error, "RPC unexpectedly succeeded for a non-member");
    assert(/not a member/i.test(error.message), `unexpected error: ${error.message}`);
  });

  await test("a second create_business call for the same user is rejected", async () => {
    const supabase = client();
    await supabase.auth.setSession(ownerSession);
    const { error } = await supabase.rpc("create_business", {
      p_name: "Second Business",
      p_currency: "USD",
      p_country: null,
      p_timezone: "UTC",
      p_fiscal_year_start_month: 1,
      p_default_tax_rate: 0,
      p_address_line1: null,
      p_city: null,
      p_phone: null,
      p_email: null,
    });
    assert(error, "second business creation unexpectedly succeeded");
    assert(/already has a business/i.test(error.message), `unexpected error: ${error.message}`);
  });

  console.log("\nApp layer — HTTP route guards & rendering");

  await test("app is reachable", async () => {
    const res = await fetch(APP_URL, { redirect: "manual" });
    assert(res.status < 500, `app returned ${res.status}`);
  });

  await test("GET /dashboard without session redirects to /login", async () => {
    const { status, location } = await fetchPage("/dashboard");
    assert(status === 307 || status === 308, `status ${status}`);
    assert(location.includes("/login"), `redirected to ${location}`);
    assert(location.includes("next=%2Fdashboard"), "next param missing");
  });

  await test("GET /login renders the sign-in form", async () => {
    const { status, body } = await fetchPage("/login");
    assert(status === 200, `status ${status}`);
    assert(body.includes("Welcome back"), "login page content missing");
  });

  await test("GET /signup renders the sign-up form", async () => {
    const { status, body } = await fetchPage("/signup");
    assert(status === 200, `status ${status}`);
    assert(body.includes("Create your account"), "signup page content missing");
  });

  await test("signed-in user WITHOUT a business is sent to /onboarding", async () => {
    const data3 = await signUp(USERS.newbie);
    newbieSession = data3.session;
    const cookie = sessionCookieUrl(newbieSession);
    const { status, location } = await fetchPage("/dashboard", cookie);
    assert(status === 307 || status === 308, `status ${status}`);
    assert(location.includes("/onboarding"), `redirected to ${location}`);
    const page = await fetchPage("/onboarding", cookie);
    assert(page.status === 200, `/onboarding status ${page.status}`);
    assert(page.body.includes("Welcome to Business OS"), "wizard content missing");
  });

  await test("GET /dashboard with session renders the business dashboard", async () => {
    const cookie = sessionCookieUrl(ownerSession);
    const { status, body } = await fetchPage("/dashboard", cookie);
    assert(status === 200, `status ${status}`);
    assert(body.includes(BUSINESS_NAME), "dashboard does not show the business name");
    assert(body.includes("Revenue this month"), "KPI cards missing");
  });

  await test("GET /login with session redirects to /dashboard", async () => {
    const cookie = sessionCookieUrl(ownerSession);
    const { status, location } = await fetchPage("/login", cookie);
    assert(status === 307 || status === 308, `status ${status}`);
    assert(location.includes("/dashboard"), `redirected to ${location}`);
  });

  await test("protected routes are still guarded once the session is gone", async () => {
    const { status, location } = await fetchPage("/invoices");
    assert(status === 307 || status === 308, `status ${status}`);
    assert(location.includes("/login"), `redirected to ${location}`);
  });

  // ---------------------------------------------------------------------
  // Cleanup (only when a service-role key was provided)
  // ---------------------------------------------------------------------

  if (SERVICE_ROLE_KEY) {
    try {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      for (const who of Object.values(USERS)) {
        const { data } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const user = data.users.find((u) => u.email === who.email);
        if (user) await admin.auth.admin.deleteUser(user.id);
      }
      console.log("\nCleanup: test users deleted (business rows cascaded).");
    } catch {
      console.log("\nCleanup: could not delete test users — remove bos-e2e-* manually.");
    }
  } else {
    console.log(
      "\nCleanup skipped: no SUPABASE_SERVICE_ROLE_KEY provided.\n" +
        `Three test users (bos-e2e-*-${RUN}@example.com) remain in auth.users.`,
    );
  }

  // ---------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULT: ${passed}/${results.length} passed, ${failed} failed`);
  console.log(`${"=".repeat(60)}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
