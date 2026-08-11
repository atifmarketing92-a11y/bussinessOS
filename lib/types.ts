/**
 * Domain types shared across the app.
 *
 * Note: Postgres `numeric` columns are returned as strings by PostgREST to
 * preserve precision — money fields are typed `string` accordingly and are
 * formatted via `formatMoney()`.
 */

export type MemberRole = "owner" | "admin" | "member";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  currency: string;
  country: string | null;
  timezone: string;
  fiscal_year_start_month: number;
  default_tax_rate: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  /** Present when selected via a join: `select("business:businesses(*)")` */
  business?: Business;
}

export interface ExpenseCategory {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
}
