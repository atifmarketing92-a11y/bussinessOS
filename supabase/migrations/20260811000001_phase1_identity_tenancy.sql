-- ============================================================================
-- Business OS — Phase 1: Identity & tenancy foundation
--
-- Tables:    profiles, businesses, members, expense_categories, counters
-- Functions: handle_new_user, set_updated_at, is_member,
--            create_business, next_document_number
-- Security:  RLS enabled + forced on every table; all access scoped to
--            business membership via is_member().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'member');

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- 1:1 extension of auth.users
create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  full_name              text not null default '',
  avatar_url             text,
  onboarding_completed   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.businesses (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (char_length(trim(name)) between 1 and 120),
  currency                char(3) not null default 'USD' check (currency = upper(currency)),
  country                 text,
  timezone                text not null default 'UTC',
  fiscal_year_start_month smallint not null default 1
                          check (fiscal_year_start_month between 1 and 12),
  default_tax_rate        numeric(5, 2) not null default 0
                          check (default_tax_rate between 0 and 100),
  address_line1           text,
  address_line2           text,
  city                    text,
  postal_code             text,
  phone                   text,
  email                   text,
  logo_url                text,
  created_by              uuid not null references auth.users (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.members (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.member_role not null default 'member',
  created_at  timestamptz not null default now(),
  constraint members_one_membership_per_pair unique (business_id, user_id),
  -- MVP: one business per user. DROP this constraint when team invites ship.
  constraint members_one_business_per_user_mvp unique (user_id)
);

create index members_user_id_idx on public.members (user_id);

create table public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  created_at  timestamptz not null default now()
);

create unique index expense_categories_unique_name_idx
  on public.expense_categories (business_id, lower(name));

-- Sequential document numbers (sales, invoices). Deliberately has NO direct
-- RLS policies: it is only ever touched through next_document_number().
create table public.counters (
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind        text not null check (kind in ('sale', 'invoice')),
  last_value  bigint not null default 0 check (last_value >= 0),
  primary key (business_id, kind)
);

-- ----------------------------------------------------------------------------
-- 3. updated_at trigger
-- ----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Auth trigger: create a profile row for every new auth user
-- ----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. Membership helper (used by every RLS policy)
-- ----------------------------------------------------------------------------
create function public.is_member(biz uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where business_id = biz
      and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Onboarding: atomically create business + owner membership + categories
-- ----------------------------------------------------------------------------
create function public.create_business(
  p_name text,
  p_currency char,
  p_country text default null,
  p_timezone text default 'UTC',
  p_fiscal_year_start_month smallint default 1,
  p_default_tax_rate numeric default 0,
  p_address_line1 text default null,
  p_city text default null,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_business_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.members where user_id = v_user) then
    raise exception 'user already has a business';
  end if;

  insert into public.businesses (
    name, currency, country, timezone, fiscal_year_start_month,
    default_tax_rate, address_line1, city, phone, email, created_by
  ) values (
    trim(p_name), upper(p_currency), p_country, p_timezone, p_fiscal_year_start_month,
    p_default_tax_rate, p_address_line1, p_city, p_phone, p_email, v_user
  )
  returning id into v_business_id;

  insert into public.members (business_id, user_id, role)
  values (v_business_id, v_user, 'owner');

  insert into public.expense_categories (business_id, name) values
    (v_business_id, 'Rent'),
    (v_business_id, 'Salaries'),
    (v_business_id, 'Supplies'),
    (v_business_id, 'Utilities'),
    (v_business_id, 'Marketing'),
    (v_business_id, 'Transport'),
    (v_business_id, 'Other');

  update public.profiles
  set onboarding_completed = true
  where id = v_user;

  return v_business_id;
end;
$$;

revoke execute on function public.create_business(text, char, text, text, smallint, numeric, text, text, text, text) from public, anon;
grant execute on function public.create_business(text, char, text, text, smallint, numeric, text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Sequential document numbers (used by sales & invoices in later phases)
-- ----------------------------------------------------------------------------
create function public.next_document_number(p_business uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value bigint;
  v_prefix text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_member(p_business) then
    raise exception 'not a member of this business';
  end if;

  v_prefix := case p_kind
    when 'sale' then 'S-'
    when 'invoice' then 'INV-'
    else null
  end;
  if v_prefix is null then
    raise exception 'unknown document kind: %', p_kind;
  end if;

  insert into public.counters (business_id, kind, last_value)
  values (p_business, p_kind, 1)
  on conflict (business_id, kind)
  do update set last_value = public.counters.last_value + 1
  returning last_value into v_value;

  return v_prefix || lpad(v_value::text, 5, '0');
end;
$$;

revoke execute on function public.next_document_number(uuid, text) from public, anon;
grant execute on function public.next_document_number(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.members enable row level security;
alter table public.expense_categories enable row level security;
alter table public.counters enable row level security; -- deny-all: RPC only

-- profiles: users manage only their own row
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- businesses: members read/update; creation only via create_business()
create policy "businesses_select_member" on public.businesses
  for select to authenticated
  using (public.is_member(id));

create policy "businesses_update_member" on public.businesses
  for update to authenticated
  using (public.is_member(id))
  with check (public.is_member(id));

-- members: users only see their own membership rows.
-- Rows are written exclusively by security-definer functions (onboarding,
-- and later team invites), never by client INSERT/UPDATE.
create policy "members_select_own" on public.members
  for select to authenticated
  using (user_id = auth.uid());

-- expense_categories: full CRUD for members
create policy "expense_categories_select_member" on public.expense_categories
  for select to authenticated
  using (public.is_member(business_id));

create policy "expense_categories_insert_member" on public.expense_categories
  for insert to authenticated
  with check (public.is_member(business_id));

create policy "expense_categories_update_member" on public.expense_categories
  for update to authenticated
  using (public.is_member(business_id))
  with check (public.is_member(business_id));

create policy "expense_categories_delete_member" on public.expense_categories
  for delete to authenticated
  using (public.is_member(business_id));
