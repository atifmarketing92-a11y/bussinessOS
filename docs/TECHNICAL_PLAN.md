# Business OS — Technical Plan

> **Status:** ✅ APPROVED (2026-08-11) — implementation started with Phase 0 + Phase 1.
> **Last updated:** 2026-08-11

## Approval decisions log

Confirmed by the product owner on approval:

1. Keep Next.js + Supabase + Tailwind + shadcn/ui architecture.
2. One business per user for the MVP.
3. Schema stays team-ready for future expansion.
4. Sales and Invoices remain separate modules.
5. Inventory deduction is tied to Sales, not Invoices.
6. MVP profit/loss reporting is simple and cash-basis.
7. **No Stripe billing yet** — added after the core MVP is stable.
8. PDF invoice export stays post-MVP.
9. Simplicity for small-business owners beats advanced accounting features.

---

Business OS is a simple business management platform for small businesses: one place to
track sales, products & inventory, customers, expenses, and invoices, with an automatic
profit/loss report and a dashboard that answers "how is my business doing?" at a glance.

**Guiding principles**

1. **Simple first.** Every screen should be understandable by a non-technical shop owner.
2. **Multi-tenant from day one.** All data is scoped to a `business`, so teams, agencies,
   and multi-user plans can be added later without schema surgery.
3. **Boring, proven stack.** Next.js + Supabase + Vercel. No exotic dependencies.
4. **Server-first.** React Server Components and Server Actions by default; client
   JavaScript only where interactivity demands it.

---

## Table of contents

1. [Product architecture](#1-product-architecture)
2. [User flow](#2-user-flow)
3. [Database schema](#3-database-schema)
4. [Database relationships](#4-database-relationships)
5. [Authentication architecture](#5-authentication-architecture)
6. [Security and Row Level Security](#6-security-and-row-level-security)
7. [Application folder structure](#7-application-folder-structure)
8. [API / server architecture](#8-api--server-architecture)
9. [MVP development phases](#9-mvp-development-phases)
10. [Future Stripe billing architecture](#10-future-stripe-billing-architecture)
11. [Key product decisions & open questions](#11-key-product-decisions--open-questions)

---

## 1. Product architecture

### 1.1 Stack

| Concern          | Choice                                                          | Why                                                                             |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Framework        | **Next.js 16** (App Router, React Server Components, Turbopack) | Active LTS (Oct 2025). Server-first model fits a data-heavy CRUD app perfectly. |
| Language         | **TypeScript** (strict mode)                                    | Money and inventory data demand type safety.                                    |
| Styling          | **Tailwind CSS v4** + **shadcn/ui**                             | Fast to build a clean, consistent UI; accessible primitives out of the box.     |
| Database         | **Supabase (Postgres 15+)**                                     | Managed Postgres with Row Level Security = multi-tenant safety by default.      |
| Auth             | **Supabase Auth** (email/password, magic link, Google OAuth)    | Free tier, session handling built into the SDK, no separate auth service.       |
| File storage     | **Supabase Storage**                                            | Expense receipts, business logo; RLS policies apply to files too.               |
| Validation       | **Zod**                                                         | One schema language for forms, Server Actions, and (later) API routes.          |
| Deployment       | **Vercel**                                                      | Zero-config Next.js deploys, preview URLs per PR, edge middleware.              |
| Payments (later) | **Stripe**                                                      | Checkout + Billing Portal means we write almost no billing UI.                  |

### 1.2 High-level diagram

```
                        ┌────────────────────────────────────────────┐
                        │                 Vercel                     │
   Browser  ──────────► │  Next.js 16 app                            │
   (React SPA pages     │  ┌──────────────┐   ┌───────────────────┐  │
    + RSC streaming)    │  │ Server       │   │ Middleware        │  │
                        │  │ Components + │   │ (session refresh, │  │
                        │  │ Server       │   │  route guards)    │  │
                        │  │ Actions      │   └───────────────────┘  │
                        │  └──────┬───────┘                          │
                        │         │  Route Handlers only for:        │
                        │         │  /api/webhooks/stripe (later)    │
                        └─────────┼──────────────────────────────────┘
                                  │  supabase-js with the user's JWT
                                  ▼
                        ┌────────────────────────────────────────────┐
                        │               Supabase                     │
                        │  Auth ─ Postgres (RLS on every table)      │
                        │       ─ Storage (receipts, logos)          │
                        │       ─ (later) Edge Functions: webhooks   │
                        └────────────────────────────────────────────┘
```

### 1.3 Data-flow rules

- **Reads** happen in Server Components via a small data-access layer (`lib/server/`).
  The Supabase client used there carries the _signed-in user's_ session, so RLS applies.
- **Writes** happen in **Server Actions** ("use server"), each validated with Zod,
  always scoped to the current user's business. No client component writes to the DB directly.
- **The service-role key never ships to the browser** and is only used (much later, if
  ever) by Stripe webhook processing.
- A single Supabase project serves all environments via separate schemas? **No** —
  simpler: one Supabase project for prod, one for dev/staging, selected by env vars
  (`NEXT_PUBLIC_SUPABASE_URL`, etc.). Migrations are versioned in the repo and applied
  with the Supabase CLI, so both stay in sync.

### 1.4 Tenancy model

- A **user** signs up, then creates exactly **one business** during onboarding (MVP).
- The schema already contains a `members` table (`user ↔ business + role`), so the path
  to "invite staff / accountant" later is a feature, not a migration.
- MVP enforces one-business-per-user at the app level (and with a DB unique constraint
  that we drop when teams ship).

### 1.5 What the MVP explicitly does NOT include

To keep scope tight, these are deferred: multi-user/team invites, multi-currency
conversion, purchase orders/supplier management, payroll, tax filing, bank feeds,
mobile native apps, public API, Stripe billing (designed in §10, built after MVP).

---

## 2. User flow

### 2.1 First-run (onboarding)

```
Landing page (/)
   │  "Create free account"
   ▼
Sign up (/signup)  ── email + password, or Google OAuth
   │  email confirmation (if enabled) / OAuth redirect (/auth/callback)
   ▼
Onboarding (/onboarding)
   │  Step 1: Business name
   │  Step 2: Currency (ISO-4217 picker), country, fiscal year start month
   │  Step 3: Optional — business address, default tax rate, logo
   ▼
Dashboard (/dashboard)  ── empty states guide the user to their first actions
```

A server-side guard runs on every `(app)` route:

- not authenticated → redirect `/login`
- authenticated but no business → redirect `/onboarding`
- authenticated + business → allowed

### 2.2 Day-to-day usage

```
Dashboard
 ├─ KPIs: revenue / expenses / profit (this month), cash on hand
 ├─ Alerts: low-stock products, overdue invoices
 └─ Recent activity: last sales & expenses

Sales (/sales)
   New sale  → pick customer (optional) → add product lines (or free-text lines)
             → discount/tax → payment method → Save
             → stock decremented, sale number assigned (S-00001), dashboard updates

Products (/products)
   CRUD products; track stock qty, cost, price, low-stock threshold
   Stock history page shows every adjustment (sale, manual fix)

Customers (/customers)
   CRUD customers; per-customer view shows their sales, invoices, balance owed

Expenses (/expenses)
   New expense → category, vendor, amount, date, optional receipt photo upload

Invoices (/invoices)
   New invoice → customer (required) → line items → due date → status draft
   Send (mark sent, later: email/PDF) → record payments → status auto-updates
   (partial / paid / overdue is computed)

Reports (/reports)
   Profit & Loss for a date range (default: this month, last month, YTD)
   Revenue = completed sales + invoice payments received (cash basis)
   Expenses grouped by category. Simple bar/line trend chart.

Settings (/settings)
   Business profile, currency, tax rate, invoice numbering prefix,
   account (change password, delete account/business)
```

### 2.3 State conventions

Every list screen gets: search, sensible sorting (newest first), pagination at 50 rows,
empty state with a call-to-action, and loading skeletons. Every form gets: inline
validation errors, optimistic-feeling submission (disabled button + spinner), and a
toast on success/failure.

---

## 3. Database schema

Conventions:

- `uuid` primary keys (gen_random_uuid), `created_at`/`updated_at` timestamptz on all tables.
- **Money:** `numeric(14,2)` — exact decimal in Postgres, no float drift.
- **Quantities:** `numeric(12,2)` so businesses selling by weight/volume work too.
- Every tenant table carries `business_id` (including child tables — see §6 for why).
- Postgres enums for fixed vocabularies.
- All tables live in the `public` schema; migrations managed by Supabase CLI.

### 3.1 Identity & tenancy

```sql
-- 1:1 extension of auth.users
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  onboarding_completed boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table businesses (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  currency                 char(3) not null default 'USD',      -- ISO 4217
  country                  text,
  timezone                 text not null default 'UTC',
  fiscal_year_start_month  smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  default_tax_rate         numeric(5,2) not null default 0,     -- percent, e.g. 18.00
  address_line1            text,
  address_line2            text,
  city                     text,
  postal_code              text,
  phone                    text,
  email                    text,
  logo_url                 text,
  created_by               uuid not null references auth.users(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create type member_role as enum ('owner', 'admin', 'member');  -- MVP uses 'owner' only

create table members (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (business_id, user_id),
  unique (user_id)   -- MVP: one business per user. DROP this constraint when teams ship.
);
```

### 3.2 Catalog & people

```sql
create table products (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references businesses(id) on delete cascade,
  name               text not null,
  sku                text,
  description        text,
  unit               text not null default 'pc',           -- pc, kg, hr, ...
  price              numeric(14,2) not null default 0 check (price >= 0),
  cost               numeric(14,2) not null default 0 check (cost >= 0),
  track_inventory    boolean not null default true,
  stock_qty          numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 5,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (business_id, sku)                                -- partial index where sku not null
);

create table customers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  address     text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### 3.3 Sales

```sql
create type payment_method as enum ('cash', 'card', 'bank_transfer', 'mobile_money', 'other');
create type sale_status    as enum ('completed', 'void');

create table sales (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  sale_number    text not null,                    -- 'S-00001', via counters RPC (§6.4)
  customer_id    uuid references customers(id) on delete set null,   -- walk-in = null
  sale_date      date not null default current_date,
  status         sale_status not null default 'completed',
  payment_method payment_method not null default 'cash',
  subtotal       numeric(14,2) not null,
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_amount     numeric(14,2) not null default 0 check (tax_amount >= 0),
  total          numeric(14,2) not null check (total >= 0),
  notes          text,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, sale_number)
);

-- Child table. business_id denormalized for simple, fast RLS (§6).
create table sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,  -- null = free-text line
  description text not null,
  qty         numeric(12,2) not null check (qty > 0),
  unit_price  numeric(14,2) not null check (unit_price >= 0),
  line_total  numeric(14,2) not null
);

-- Stock audit trail (sales, manual corrections, initial counts)
create type stock_reason as enum ('sale', 'manual', 'initial', 'restock');

create table stock_movements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  qty_change  numeric(12,2) not null,              -- negative for sales
  reason      stock_reason not null,
  sale_id     uuid references sales(id) on delete set null,
  note        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
```

### 3.4 Expenses

```sql
create table expense_categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  unique (business_id, name)
);

create table expenses (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  category_id    uuid references expense_categories(id) on delete set null,
  vendor         text,
  description    text not null,
  expense_date   date not null default current_date,
  amount         numeric(14,2) not null check (amount > 0),
  payment_method payment_method not null default 'cash',
  receipt_url    text,                              -- Supabase Storage path
  notes          text,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

### 3.5 Invoices

```sql
create type invoice_status as enum ('draft', 'sent', 'partial', 'paid', 'void');

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  invoice_number text not null,                    -- 'INV-00001', via counters RPC
  customer_id    uuid not null references customers(id) on delete restrict,
  issue_date     date not null default current_date,
  due_date       date,
  status         invoice_status not null default 'draft',
  subtotal       numeric(14,2) not null,
  discount_amount numeric(14,2) not null default 0,
  tax_amount     numeric(14,2) not null default 0,
  total          numeric(14,2) not null check (total >= 0),
  amount_paid    numeric(14,2) not null default 0,  -- maintained by trigger (§6.5)
  notes          text,
  terms          text,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create table invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  description text not null,
  qty         numeric(12,2) not null check (qty > 0),
  unit_price  numeric(14,2) not null check (unit_price >= 0),
  line_total  numeric(14,2) not null
);

create table invoice_payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  paid_date   date not null default current_date,
  amount      numeric(14,2) not null check (amount > 0),
  method      payment_method not null default 'cash',
  reference   text,
  notes       text,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);
```

**Sales vs. invoices (important product decision):** they are separate modules.
**Sales** = money received now (counter/POS-style). **Invoices** = billed to a customer,
paid later. The P&L uses _cash basis_ (§3.7), so nothing is double counted. See §11.

### 3.6 Numbering

```sql
create table counters (
  business_id uuid not null references businesses(id) on delete cascade,
  kind        text not null check (kind in ('sale', 'invoice')),
  last_value  bigint not null default 0,
  primary key (business_id, kind)
);
-- No direct RLS access. Only the security-definer RPC in §6.4 touches this.
```

### 3.7 Reporting (no tables needed)

P&L is computed in Postgres views/functions per business + date range:

- **Revenue (cash basis)** = Σ `sales.total` (status `completed`) + Σ `invoice_payments.amount`
- **COGS (optional line)** = Σ sale_items `qty × product.cost` at time of report (MVP: current cost)
- **Expenses** = Σ `expenses.amount`, grouped by category
- **Net profit** = Revenue − Expenses

Implemented as two SQL functions (`report_profit_loss(business_id, from_date, to_date)`
returning JSONB, or views + server-side aggregation) so the report page is one query.

### 3.8 Indexes

- `(business_id)` on every tenant table (composite with date columns for reports):
  `sales(business_id, sale_date)`, `expenses(business_id, expense_date)`,
  `invoices(business_id, issue_date)`, `invoice_payments(business_id, paid_date)`.
- `customers(business_id)` + GIN trigram index on `name` for search.
- `products(business_id, name)`, unique partial on `sku`.
- `invoices(business_id, status)` for the "overdue/outstanding" queries.

---

## 4. Database relationships

```
auth.users 1──1 profiles
auth.users 1──┬─< members >──1 businesses          (teams-ready; MVP: exactly 1 row/user)
              └─ created_by on sales/expenses/invoices

businesses 1──< products
businesses 1──< customers
businesses 1──< expense_categories 1──< expenses
businesses 1──< sales 1──< sale_items >──0..1 products
businesses 1──< sales 1──< stock_movements >──1 products
businesses 1──< invoices 1──< invoice_items >──0..1 products
businesses 1──< invoices >──1 customers
businesses 1──< invoices 1──< invoice_payments
businesses 1──< counters
```

Cardinality and cascade rules:

| Parent → Child                    | On delete | Rationale                                          |
| --------------------------------- | --------- | -------------------------------------------------- |
| auth.users → profile, members     | CASCADE   | Account deletion removes identity links.           |
| businesses → everything           | CASCADE   | "Delete my business" is a hard wipe (Settings).    |
| customers → sales                 | SET NULL  | History survives customer deletion.                |
| customers → invoices              | RESTRICT  | Never delete a customer with invoices; void first. |
| products → sale/invoice items     | SET NULL  | Line items keep their description/price.           |
| sales → sale_items, movements     | CASCADE   | Voiding/deleting a sale cleans its lines & stock.  |
| invoices → invoice_items/payments | CASCADE   | Deleting a draft invoice cleans children.          |

Key derived relationships (computed, not stored):

- **Outstanding invoice balance** = `total − amount_paid`, status `sent`/`partial` (+ overdue = `due_date < today`).
- **Customer balance owed** = Σ outstanding across their invoices.
- **Product stock** = `products.stock_qty`, mirrored by `stock_movements` audit trail.

---

## 5. Authentication architecture

### 5.1 Methods (MVP)

| Method             | Notes                                                |
| ------------------ | ---------------------------------------------------- |
| Email + password   | Default. Email confirmation ON in prod, OFF in dev.  |
| Magic link (email) | One-tap sign-in for non-technical owners.            |
| Google OAuth       | PKCE flow via `/auth/callback`; huge conversion win. |

### 5.2 Session handling (Next.js + Supabase)

Using **`@supabase/ssr`** (the cookie-based Supabase client for SSR frameworks):

```
lib/supabase/client.ts   createBrowserClient()      → client components (rarely needed)
lib/supabase/server.ts   createServerClient(cookies) → RSC + Server Actions
middleware.ts              refreshes the session cookie on every request
app/auth/callback/route.ts  exchanges the PKCE code → session, then redirects
```

- Sessions live in **httpOnly cookies** managed by `@supabase/ssr` with automatic
  refresh-token rotation. No localStorage tokens.
- `middleware.ts` runs on all `(app)` routes: refresh session → redirect unauthenticated
  users to `/login`. This is a _UX_ guard; **authorization is always enforced by RLS**,
  not by middleware.
- Helper `requireUser()` / `requireBusiness()` in `lib/server/auth.ts`:
  1. create server client from cookies,
  2. `auth.getUser()` (not just `getSession()` — validates against the server),
  3. load the user's business via `members`,
  4. redirect if missing. Every Server Action calls this first.

### 5.3 Account lifecycle

- **Sign-up trigger** (`on_auth_user_created`) inserts the `profiles` row.
- **Onboarding** server action (atomic, single RPC/transaction):
  create `businesses` row → create `members` (role `owner`) row → seed default
  expense categories (Rent, Salaries, Supplies, Utilities, Marketing, Transport, Other)
  → set `profiles.onboarding_completed = true`.
- **Password reset**: Supabase built-in flow (`/forgot-password` → email → `/reset-password`).
- **Account deletion** (Settings → danger zone): delete business (CASCADE wipes data),
  then delete the auth user via server-side admin call. No orphan rows.

---

## 6. Security and Row Level Security

Security model in one sentence: **the browser only ever holds a user-scoped JWT, and
Postgres itself refuses any row the user's business doesn't own.**

### 6.1 Baseline

- RLS **enabled and forced** on every table (including `counters` = deny-all).
- Supabase `anon`/publishable key is safe to ship to the browser _because_ of RLS.
- `service_role` key: server env var only, used only for account-deletion admin call
  (and later Stripe webhooks). Never imported in client code — enforced by code review
  and a lint rule (`no-restricted-imports`).
- All mutations go through Zod-validated Server Actions; server recomputes money totals
  from line items (client-supplied totals are never trusted).
- Denormalized `business_id` on child tables is **enforced by trigger** to match the
  parent row's `business_id` — clients cannot graft rows onto another tenant.
- Rate limiting: Supabase built-in auth rate limits + Vercel; add `upstash/ratelimit`
  on auth endpoints if abuse appears.
- HTTPS-only, secure cookie flags (handled by `@supabase/ssr` + Vercel), CSP header
  allowing only needed origins, no eval.

### 6.2 Membership helper

```sql
create function public.is_member(biz uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from members
    where business_id = biz and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_member(uuid) from anon;
grant execute on function public.is_member(uuid) to authenticated;
```

### 6.3 Policy pattern (applied to every tenant table)

```sql
alter table sales enable row level security;

create policy "members read own business sales" on sales
  for select to authenticated using (is_member(business_id));

create policy "members insert own business sales" on sales
  for insert to authenticated with check (is_member(business_id));

create policy "members update own business sales" on sales
  for update to authenticated using (is_member(business_id)) with check (is_member(business_id));

create policy "members delete own business sales" on sales
  for delete to authenticated using (is_member(business_id));
```

Child tables (`sale_items`, `invoice_items`, `invoice_payments`, `stock_movements`)
use the same pattern against their own denormalized `business_id`, plus the parent-match
trigger. `profiles`: `select/update using (id = auth.uid())`. `members`:
`select using (user_id = auth.uid())` — users can see membership rows that involve them;
no client insert/update (onboarding action writes it server-side within the same request
context; if needed, a security-definer RPC does it).

### 6.4 Sequential document numbers (safe under concurrency)

```sql
create function public.next_document_number(p_business uuid, p_kind text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v bigint;
  prefix text := case p_kind when 'sale' then 'S-' when 'invoice' then 'INV-' end;
begin
  if not public.is_member(p_business) then
    raise exception 'not a member';
  end if;
  insert into counters (business_id, kind, last_value) values (p_business, p_kind, 1)
  on conflict (business_id, kind)
  do update set last_value = counters.last_value + 1
  returning last_value into v;
  return prefix || lpad(v::text, 5, '0');
end;
$$;
```

Atomic (single upsert), gap-free enough for small business use, and unforgeable because
`counters` has no RLS grants of its own.

### 6.5 Invoice payment trigger

After insert/update/delete on `invoice_payments`: recompute `amount_paid` and set
`status` → `paid` (paid ≥ total), `partial` (0 < paid < total), else back to `sent`.
Keeps list screens free of per-row aggregation and makes tampering pointless.

### 6.6 Storage (receipts, logo)

- Private bucket `receipts`; paths `{business_id}/{expense_id}/{filename}`.
- Storage policies mirror RLS:

```sql
create policy "members read own receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_member(((storage.foldername(name))[1])::uuid));
-- same shape for insert/delete
```

- Uploads validated server-side (MIME whitelist: pdf/jpg/png/webp; max 5 MB).

---

## 7. Application folder structure

```
bussinessOS/
├── app/
│   ├── (marketing)/                  # public pages, no auth
│   │   ├── page.tsx                  # landing
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx                # centered card layout
│   ├── auth/callback/route.ts        # OAuth / magic-link code exchange
│   ├── (onboarding)/
│   │   └── onboarding/page.tsx
│   ├── (app)/                        # authenticated shell (sidebar + topbar)
│   │   ├── layout.tsx                # requireBusiness(), nav, plan badge (later)
│   │   ├── dashboard/page.tsx
│   │   ├── sales/
│   │   │   ├── page.tsx              # list
│   │   │   ├── new/page.tsx          # multi-line form
│   │   │   └── [id]/page.tsx         # detail / void
│   │   ├── products/                 # list, new/edit sheet, [id] stock history
│   │   ├── customers/                # list, [id] with sales+invoices tabs
│   │   ├── expenses/                 # list, new/edit sheet (receipt upload)
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx         # detail, record payment, status timeline
│   │   ├── reports/page.tsx          # P&L + range picker
│   │   └── settings/page.tsx         # business profile, tax, numbering, danger zone
│   ├── api/
│   │   └── webhooks/stripe/route.ts  # later (§10) — only Route Handler in MVP+
│   ├── layout.tsx                    # root: fonts, providers, metadata
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── layout/                       # sidebar, topbar, mobile nav
│   ├── dashboard/                    # KPI cards, charts, recent activity
│   ├── sales/  products/  customers/  expenses/  invoices/  reports/  settings/
│   └── shared/                       # data-table, money display, empty states,
│                                     # search-input, date-range-picker, toasts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # browser client
│   │   ├── server.ts                 # server client (cookies)
│   │   └── middleware.ts             # session refresh helper
│   ├── server/                       # SERVER-ONLY data access layer
│   │   ├── auth.ts                   # requireUser / requireBusiness
│   │   ├── queries/                  # read functions used by RSC
│   │   │   ├── sales.ts  products.ts  customers.ts  expenses.ts
│   │   │   ├── invoices.ts  dashboard.ts  reports.ts
│   │   ├── actions/                  # 'use server' mutations (Zod-validated)
│   │   │   ├── auth.actions.ts  onboarding.actions.ts  sales.actions.ts
│   │   │   ├── products.actions.ts  customers.actions.ts  expenses.actions.ts
│   │   │   ├── invoices.actions.ts  settings.actions.ts
│   │   └── pricing.ts                # (later) plan definitions
│   ├── validators/                   # Zod schemas shared by forms + actions
│   │   ├── sale.schema.ts  product.schema.ts  customer.schema.ts  …
│   ├── format.ts                     # money (Intl.NumberFormat + currency), dates
│   ├── calculations.ts               # pure fns: line totals, P&L math (unit-tested)
│   └── utils.ts
├── middleware.ts                     # session refresh + route guards
├── supabase/
│   ├── migrations/                   # versioned SQL via Supabase CLI
│   ├── seed.sql                      # demo business for development
│   └── config.toml
├── tests/                            # calculations + critical-flow e2e (Playwright)
├── .env.example                      # NEXT_PUBLIC_SUPABASE_URL, _ANON_KEY,
│                                     # SUPABASE_SERVICE_ROLE_KEY (server only),
│                                     # STRIPE_* (later)
├── next.config.ts  tailwind config   tsconfig.json  package.json
└── docs/TECHNICAL_PLAN.md            # this document
```

Rules enforced by convention + ESLint boundaries:

- `components/**` may import `lib/validators`, `lib/format` — never `lib/server/*`.
- `lib/server/*` is the **only** place Supabase clients are created.
- One feature per domain folder; shared UI stays dumb/reusable.

---

## 8. API / server architecture

### 8.1 Philosophy: no hand-written REST API for the MVP

Next.js gives us three primitives; we use each where it's strongest:

| Primitive             | Used for                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server Components** | All reads: lists, detail pages, dashboard, reports. Data fetched server-side with the user's session → RLS applies → zero client fetch code. |
| **Server Actions**    | All mutations: create/update/delete, onboarding, record payment. Progressive enhancement; forms work without custom fetch plumbing.          |
| **Route Handlers**    | Only cross-service endpoints: `/auth/callback` and (later) `/api/webhooks/stripe`.                                                           |

This avoids building/serializing/maintaining a parallel API layer for features that have
exactly one consumer (our own UI). When a public API is ever needed, it can be added as
Route Handlers on top of the same `lib/server` functions.

### 8.2 Mutation contract

Every Server Action follows one shape:

```ts
type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createSale(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, business } = await requireBusiness();        // 1. auth
  const parsed = saleCreateSchema.safeParse(input);           // 2. validation (Zod)
  if (!parsed.success) return { ok: false, ... };             // 3. typed errors
  // 4. business rules: recompute totals server-side, check stock,
  //    next_document_number() RPC, insert sale + items + stock movements
  // 5. revalidatePath('/sales'), revalidatePath('/dashboard')
}
```

Multi-row writes (sale + items + stock movements) run in a **Postgres transaction** via
a Supabase RPC or `.rpc()`-wrapped SQL function where atomicity matters — the MVP sale
creation uses one `create_sale(...)` SQL function to keep inventory consistent; simpler
CRUD (products, customers, expenses) uses plain multi-step inserts.

### 8.3 Caching / revalidation

- Pages are dynamic by default (auth-dependent). After each mutation, actions call
  `revalidatePath()` for the affected list/detail/dashboard routes.
- Report queries are computed on demand; date ranges are query params, so no stale cache.

### 8.4 Error handling & logging

- Actions never throw raw errors to the client; they return `ActionResult` with
  user-safe messages. Server logs get the full context via a tiny `logger` util.
- DB constraint violations (unique sku, FK restrict) are mapped to friendly field errors
  ("A product with this SKU already exists").

### 8.5 Testing strategy (lean)

- **Unit:** `lib/calculations.ts` (line totals, tax, P&L math) — pure functions, 100%.
- **Integration:** SQL functions (`next_document_number`, payment trigger) tested via
  Supabase CLI local stack (`supabase start`) in CI.
- **E2E:** Playwright happy paths — signup→onboarding→product→sale→expense→P&L.

---

## 9. MVP development phases

Each phase ends with a deployable, demo-able increment on a Vercel preview URL.

| #   | Phase                        | Scope                                                                                                                                                                                                               | Exit criteria (demo)                                                                                               | Est.  |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| 0   | **Foundations**              | Next.js 16 + TS strict + Tailwind v4 + shadcn/ui scaffold; Supabase project + CLI migrations wired; env vars; ESLint/Prettier; CI (lint + typecheck); deploy pipeline to Vercel                                     | Empty app deployed; `supabase db push` works from CI                                                               | 1–2 d |
| 1   | **Auth & onboarding**        | Signup/login (email + Google), magic link, callback route, middleware guards, profile trigger, onboarding wizard creating business + owner membership + default categories                                          | New user can sign up, create "Acme Shop", land on empty dashboard; second user cannot see Acme data (RLS verified) | 2–3 d |
| 2   | **App shell & dashboard v1** | Sidebar/topbar layout, nav, empty states, dashboard KPI cards reading real (empty) queries, money/date formatting utilities                                                                                         | Responsive shell; dashboard renders zeros gracefully                                                               | 2 d   |
| 3   | **Products & inventory**     | Product CRUD, stock fields, manual stock adjustment + `stock_movements` history view, low-stock badge                                                                                                               | Add 5 products, adjust stock, see history                                                                          | 2–3 d |
| 4   | **Customers**                | Customer CRUD, search, detail page with placeholder tabs                                                                                                                                                            | Add/search customers                                                                                               | 1–2 d |
| 5   | **Sales**                    | Multi-line sale form (product picker + free text), server-computed totals/tax/discount, `create_sale` transactional RPC (number, items, stock decrement, movements), sales list/detail, void sale                   | Full sale flow end-to-end; stock decrements; dashboard KPIs update                                                 | 3–4 d |
| 6   | **Expenses**                 | Category management, expense CRUD with date/amount/vendor, receipt photo upload to Storage                                                                                                                          | Record expenses with receipts                                                                                      | 2 d   |
| 7   | **Invoices**                 | Invoice CRUD (customer required, items, due date), numbering, status machine, record-payment flow + trigger, overdue computation, customer "balance owed"                                                           | Draft → sent → partially paid → paid lifecycle works                                                               | 3–4 d |
| 8   | **Reports & dashboard v2**   | P&L SQL function (cash basis), range picker (month/last month/YTD/custom), expense breakdown by category, simple trend chart; dashboard: revenue/expenses/profit, low-stock list, overdue invoices, recent activity | P&L matches hand-computed numbers from demo data                                                                   | 2–3 d |
| 9   | **Settings & hardening**     | Business profile edit, tax rate, invoice/sale prefixes, change password, delete business/account; global polish (loading, errors, a11y pass, mobile); seed script                                                   | Settings all work; Lighthouse/a11y pass on key pages                                                               | 2–3 d |
| 10  | **Launch prep**              | Custom domain, prod Supabase project, envs, backup/PITR check, Playwright smoke suite green, README + runbook                                                                                                       | Live at production URL, monitored                                                                                  | 1 d   |

**Total: ~3.5–5 weeks** for one developer. Phases 3–7 are parallelizable if two devs.

Definition of done per phase: typed + linted, RLS policies added in the _same migration_
as the table, empty/loading/error states present, works on mobile, deployed to preview.

---

## 10. Future Stripe billing architecture

Designed now, built after MVP validates. Goal: **zero custom billing UI** — Stripe
Checkout + Customer Portal do the heavy lifting; we only mirror subscription state.

### 10.1 Plans (proposed)

| Plan        | Price            | Limits / features                                                                     |
| ----------- | ---------------- | ------------------------------------------------------------------------------------- |
| Free        | $0               | 1 business, 1 user, 50 products, 100 sales + 20 invoices / month, core reports        |
| Pro         | ~$19/mo, $190/yr | Unlimited records, PDF invoice export, expense reports export (CSV), priority support |
| Team _(v2)_ | ~$39/mo          | Everything + 5 team members (uses the already-present `members` table)                |

Limits live in one `PLANS` constant (`lib/server/pricing.ts`) — single source of truth
for both the marketing page and enforcement checks.

### 10.2 Data model addition

```sql
create table subscriptions (
  business_id           uuid primary key references businesses(id) on delete cascade,
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  status                text not null default 'free',   -- free|active|trialing|past_due|canceled
  plan                  text not null default 'free',   -- free|pro|team
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  updated_at            timestamptz not null default now()
);
```

Free tier = row with `status='free'` created during onboarding. **Soft enforcement:**
if the row is missing for any reason, treat as Free, never lock users out of their data.

### 10.3 Flow

```
Settings → Billing → "Upgrade"
   └► Server Action creates Stripe Checkout Session (mode=subscription,
      client_reference_id = business_id, metadata: business_id)
   └► user pays on Stripe-hosted page
   └► Stripe webhook ──► POST /api/webhooks/stripe
         1. verify signature (stripe.webhooks.constructEvent)
         2. idempotency: skip already-processed event ids (webhook_events table)
         3. upsert subscriptions row from the event payload
         4. respond 200 fast; heavy work minimal by design
   └► revalidate settings/dashboard; plan badge updates

Downgrade/cancel/update card ──► Stripe Customer Portal (hosted), same webhook loop back.
Payment failure ──► customer.subscription.updated (past_due) ──► banner in app,
      grace period 7 days, then read-only mode (data never deleted).
```

Webhooks handled: `checkout.session.completed`, `customer.subscription.created|updated|deleted`,
`invoice.payment_succeeded`, `invoice.payment_failed`.

### 10.4 Enforcement pattern

```ts
const sub = await getSubscription(business.id); // cached per-request
assertPlanAllows(sub, "products", { count: currentCount }); // throws → friendly upsell error
```

Enforced in Server Actions (server-side, can't be bypassed), with a shared
`<PlanGate>` UI component that shows upgrade prompts instead of broken buttons.

### 10.5 Operational notes

- Stripe keys server-only; webhook secret in Vercel env.
- Develop against Stripe **test mode + test clocks**; a local webhook listener
  (`stripe listen --forward-to`) in dev.
- Dunning/failed-payment emails come from Stripe automatically.
- Metrics that matter: MRR, churn, trial→paid — queryable later from `subscriptions`.

---

## 11. Key product decisions & open questions

**Decisions this plan makes (flag any you disagree with):**

1. **One business per user in MVP**, schema ready for teams.
2. **Sales and invoices are separate modules**; P&L is **cash basis**
   (revenue = completed sales + invoice payments received). No double counting.
3. **Money as `numeric(14,2)`**, single currency per business (no FX conversion).
4. **Server Actions over a REST API** for all MVP mutations.
5. Voided sales stay in history (`status='void'`, excluded from totals) rather than
   hard delete, keeping numbering and reports honest. Invoices are never deleted once
   `sent` — only voided.
6. Invoice PDF export is **post-MVP** (Phase "Invoices v2": `react-pdf` or
   `@react-pdf/renderer`, stored in Storage, shareable link).

**Open questions for you before implementation:**

1. Default currency/locale assumption (USD / `en`) for the seed data and demos?
2. Email confirmation ON in production — OK, or friction-free signup first?
3. Should invoices decrement stock (like sales) or is stock only affected by sales?
   (Plan assumes **sales decrement stock; invoices do not**, since invoiced goods may
   not have shipped. Easy to flip.)
4. Any brand direction for the UI (color, tone)? Otherwise we'll ship a clean
   neutral/slate theme with one accent color.
5. Confirm the Free/Pro plan shape in §10.1, or defer pricing entirely until after MVP.

---

**Next step:** upon your approval, we start with Phase 0 (foundations) and Phase 1
(auth + onboarding), keeping this document updated as the source of truth.
