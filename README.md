# Business OS

A simple business management platform for small businesses — sales, products &
inventory, customers, expenses, invoices, and profit/loss reports in one place.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth) · Vercel · Stripe (planned)

**Status:** 🚧 In development — Phase 0 (foundations) and Phase 1 (auth + onboarding) of the
[technical plan](docs/TECHNICAL_PLAN.md). The plan is approved; billing (Stripe) comes after the core MVP.

## Getting started

### Prerequisites

- Node.js 22+
- A [Supabase](https://supabase.com) project (free tier is fine)

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the values from your Supabase project (Project Settings → API):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL`.

3. **Apply the database schema**

   With the [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   Or paste the contents of `supabase/migrations/*.sql` into the Supabase SQL editor
   in filename order.

4. **Enable Google OAuth (optional but recommended)**

   In Supabase → Authentication → Providers → Google, add your OAuth client
   credentials, and add `https://<project-ref>.supabase.co/auth/v1/callback` as an
   authorized redirect URI in Google Cloud Console.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start the dev server         |
| `npm run build`        | Production build             |
| `npm run lint`         | ESLint                       |
| `npm run typecheck`    | TypeScript strict check      |
| `npm run format`       | Prettier write               |
| `npm run format:check` | Prettier verify (used by CI) |

## Architecture

See [docs/TECHNICAL_PLAN.md](docs/TECHNICAL_PLAN.md) for the full technical plan:
product architecture, database schema, auth, Row Level Security model, folder
structure, MVP phases, and the future Stripe billing design.

Key invariants:

- All data is scoped to a `business`; Postgres **Row Level Security** enforces tenancy.
- Reads happen in React Server Components; writes in Zod-validated Server Actions.
- The `SUPABASE_SERVICE_ROLE_KEY` is server-only and never imported in client code.

## Continuous integration

A CI workflow (prettier → eslint → typecheck → build) is provided at
`.github/ci-workflow.yml`. It is stored outside `.github/workflows/` because the
workspace's GitHub App token lacks the `workflows` permission; to activate it, copy
it to `.github/workflows/ci.yml` with a token that has that scope.

## Deployment

Deployed on [Vercel](https://vercel.com) (framework auto-detected). Set the `.env.example`
variables in the Vercel project settings. Every push gets a preview deployment.
