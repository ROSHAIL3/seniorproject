create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.organization_status as enum ('active', 'suspended', 'deleted');
create type public.organization_role as enum ('owner', 'admin', 'manager', 'staff', 'accountant');
create type public.membership_status as enum ('active', 'invited', 'disabled');
create type public.branch_status as enum ('active', 'inactive', 'archived');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  country_code text not null default 'BH' check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null default 'BHD' check (currency_code ~ '^[A-Z]{3}$'),
  time_zone text not null default 'Asia/Bahrain',
  status public.organization_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 160),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_lookup
  on public.organization_members (user_id, organization_id)
  where status = 'active';

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  code text not null check (char_length(btrim(code)) between 1 and 20),
  phone text,
  email text,
  address text,
  google_maps_url text,
  time_zone text not null default 'Asia/Bahrain',
  status public.branch_status not null default 'active',
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create unique index one_current_main_branch_per_organization
  on public.branches (organization_id)
  where is_main and status <> 'archived';

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function private.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(concat_ws(
          ' ',
          new.raw_user_meta_data ->> 'first_name',
          new.raw_user_meta_data ->> 'last_name'
        )), ''),
        ''
      ),
      160
    )
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = case
        when public.profiles.full_name = '' then excluded.full_name
        else public.profiles.full_name
      end;

  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.is_active_organization_member(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function private.ensure_owner_onboarding(
  owner_full_name text default null,
  organization_name text default null,
  branch_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  existing_organization_id uuid;
  new_organization_id uuid := gen_random_uuid();
  normalized_full_name text;
  normalized_organization_name text;
  normalized_branch_name text;
  generated_slug text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select membership.organization_id
    into existing_organization_id
  from public.organization_members membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  order by membership.created_at
  limit 1;

  if existing_organization_id is not null then
    return existing_organization_id;
  end if;

  select coalesce(auth_user.email, '')
    into current_email
  from auth.users auth_user
  where auth_user.id = current_user_id;

  normalized_full_name := left(coalesce(nullif(btrim(owner_full_name), ''), 'Slotova Owner'), 160);
  normalized_organization_name := left(
    coalesce(
      nullif(btrim(organization_name), ''),
      normalized_full_name || '''s Business'
    ),
    120
  );
  normalized_branch_name := left(
    coalesce(nullif(btrim(branch_name), ''), 'Main Branch'),
    120
  );
  generated_slug := trim(both '-' from regexp_replace(
    lower(normalized_organization_name),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
  generated_slug := coalesce(nullif(generated_slug, ''), 'slotova-business')
    || '-' || left(replace(new_organization_id::text, '-', ''), 8);

  insert into public.profiles (user_id, email, full_name)
  values (current_user_id, current_email, normalized_full_name)
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = case
        when public.profiles.full_name = '' then excluded.full_name
        else public.profiles.full_name
      end;

  insert into public.organizations (
    id,
    name,
    slug,
    country_code,
    currency_code,
    time_zone,
    created_by
  )
  values (
    new_organization_id,
    normalized_organization_name,
    generated_slug,
    'BH',
    'BHD',
    'Asia/Bahrain',
    current_user_id
  );

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    created_by
  )
  values (
    new_organization_id,
    current_user_id,
    'owner',
    'active',
    current_user_id
  );

  insert into public.branches (
    organization_id,
    name,
    code,
    time_zone,
    status,
    is_main
  )
  values (
    new_organization_id,
    normalized_branch_name,
    'MAIN',
    'Asia/Bahrain',
    'active',
    true
  );

  return new_organization_id;
end;
$$;

create or replace function public.ensure_owner_onboarding(
  owner_full_name text default null,
  organization_name text default null,
  branch_name text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ensure_owner_onboarding(
    owner_full_name,
    organization_name,
    branch_name
  );
$$;

revoke all on function private.is_active_organization_member(uuid) from public;
revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public;
revoke all on function private.ensure_owner_onboarding(text, text, text) from public;
revoke all on function public.ensure_owner_onboarding(text, text, text) from public;

grant execute on function private.is_active_organization_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;
grant execute on function private.ensure_owner_onboarding(text, text, text) to authenticated;
grant execute on function public.ensure_owner_onboarding(text, text, text) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.branches enable row level security;

create policy "members can view their organizations"
on public.organizations
for select
to authenticated
using (private.is_active_organization_member(id));

create policy "owners and admins can update their organization"
on public.organizations
for update
to authenticated
using (
  private.has_organization_role(
    id,
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  private.has_organization_role(
    id,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "members can view memberships in their organizations"
on public.organization_members
for select
to authenticated
using (private.is_active_organization_member(organization_id));

create policy "members can view their organization branches"
on public.branches
for select
to authenticated
using (private.is_active_organization_member(organization_id));

create policy "authorized members can create branches"
on public.branches
for insert
to authenticated
with check (
  private.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);

create policy "authorized members can update branches"
on public.branches
for update
to authenticated
using (
  private.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
)
with check (
  private.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);

create policy "owners and admins can delete branches"
on public.branches
for delete
to authenticated
using (
  private.has_organization_role(
    organization_id,
    array['owner', 'admin']::public.organization_role[]
  )
);

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
revoke all on table public.branches from anon, authenticated;

grant select on table public.organizations to authenticated;
grant update (
  name,
  country_code,
  currency_code,
  time_zone,
  status
) on table public.organizations to authenticated;

grant select on table public.profiles to authenticated;
grant update (
  full_name,
  phone,
  avatar_url
) on table public.profiles to authenticated;

grant select on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.branches to authenticated;

comment on table public.organizations is
  'Tenant boundary for every Slotova business-owned record.';
comment on table public.organization_members is
  'Trusted organization authorization source. Do not authorize from user_metadata.';
comment on function public.ensure_owner_onboarding(text, text, text) is
  'Idempotently creates the authenticated owner''s organization and main branch.';
