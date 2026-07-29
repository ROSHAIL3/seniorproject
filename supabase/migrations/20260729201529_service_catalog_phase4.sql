create type public.catalog_status as enum ('active', 'archived');
create type public.package_type as enum ('combo', 'flexible');

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  status public.catalog_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index service_categories_name_unique
  on public.service_categories (organization_id, lower(btrim(name)));
create unique index service_categories_organization_id_id_unique
  on public.service_categories (organization_id, id);

create table public.services (
  id text primary key default ('service-' || gen_random_uuid()::text),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  price_bhd numeric(12,3) not null check (price_bhd between 0 and 999999999.999),
  image_object_path text,
  is_active boolean not null default true,
  vat_applicable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, category_id)
    references public.service_categories (organization_id, id)
    on delete restrict,
  unique (organization_id, id)
);

create unique index services_category_name_unique
  on public.services (organization_id, category_id, lower(btrim(name)));
create index services_catalog_lookup
  on public.services (organization_id, category_id, is_active, name);

create table public.service_branches (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id text not null,
  branch_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, service_id, branch_id),
  foreign key (organization_id, service_id)
    references public.services (organization_id, id) on delete cascade,
  foreign key (organization_id, branch_id)
    references public.branches (organization_id, id) on delete cascade
);

create index service_branches_branch_lookup
  on public.service_branches (organization_id, branch_id, service_id);

create table public.service_staff (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id text not null,
  membership_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, service_id, membership_id),
  foreign key (organization_id, service_id)
    references public.services (organization_id, id) on delete cascade,
  foreign key (organization_id, membership_id)
    references public.organization_members (organization_id, id) on delete cascade
);

create index service_staff_membership_lookup
  on public.service_staff (organization_id, membership_id, service_id);

create table public.service_packages (
  id text primary key default ('package-' || gen_random_uuid()::text),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  type public.package_type not null,
  selling_price_bhd numeric(12,3) not null
    check (selling_price_bhd between 0 and 999999999.999),
  image_object_path text,
  is_active boolean not null default true,
  allow_price_above_original boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index service_packages_name_unique
  on public.service_packages (organization_id, lower(btrim(name)));
create index service_packages_active_lookup
  on public.service_packages (organization_id, is_active, name);

create table public.package_items (
  id text primary key default ('package-item-' || gen_random_uuid()::text),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id text not null,
  service_id text not null,
  quantity integer not null check (quantity between 1 and 100),
  sort_order integer not null check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  foreign key (organization_id, package_id)
    references public.service_packages (organization_id, id) on delete cascade,
  foreign key (organization_id, service_id)
    references public.services (organization_id, id) on delete restrict,
  unique (organization_id, package_id, service_id),
  unique (organization_id, package_id, sort_order)
);

create index package_items_service_lookup
  on public.package_items (organization_id, service_id);

create trigger service_categories_set_updated_at
before update on public.service_categories
for each row execute function private.set_updated_at();
create trigger services_set_updated_at
before update on public.services
for each row execute function private.set_updated_at();
create trigger service_packages_set_updated_at
before update on public.service_packages
for each row execute function private.set_updated_at();

alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_branches enable row level security;
alter table public.service_staff enable row level security;
alter table public.service_packages enable row level security;
alter table public.package_items enable row level security;

create policy "members can view service categories"
on public.service_categories for select to authenticated
using ((select private.is_active_organization_member(organization_id)));
create policy "members can view services"
on public.services for select to authenticated
using ((select private.is_active_organization_member(organization_id)));
create policy "members can view service branches"
on public.service_branches for select to authenticated
using ((select private.is_active_organization_member(organization_id)));
create policy "members can view service staff"
on public.service_staff for select to authenticated
using ((select private.is_active_organization_member(organization_id)));
create policy "members can view service packages"
on public.service_packages for select to authenticated
using ((select private.is_active_organization_member(organization_id)));
create policy "members can view package items"
on public.package_items for select to authenticated
using ((select private.is_active_organization_member(organization_id)));

revoke all on table public.service_categories from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.service_branches from anon, authenticated;
revoke all on table public.service_staff from anon, authenticated;
revoke all on table public.service_packages from anon, authenticated;
revoke all on table public.package_items from anon, authenticated;
grant select on table public.service_categories to authenticated;
grant select on table public.services to authenticated;
grant select on table public.service_branches to authenticated;
grant select on table public.service_staff to authenticated;
grant select on table public.service_packages to authenticated;
grant select on table public.package_items to authenticated;

create or replace function private.catalog_actor(required_action text)
returns public.organization_members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor public.organization_members;
begin
  select membership into actor
  from public.organization_members membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organization.status = 'active'
    and (
      membership.role in ('owner', 'admin')
      or membership.permissions -> 'Services' -> required_action = 'true'::jsonb
    )
  order by membership.created_at
  limit 1;
  if actor.id is null then raise exception 'CATALOG_FORBIDDEN'; end if;
  return actor;
end;
$$;

create or replace function public.upsert_service_category(
  target_category_id uuid,
  category_name text,
  category_status public.catalog_status
)
returns public.service_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members;
  result public.service_categories;
begin
  actor := private.catalog_actor(case when target_category_id is null then 'create' else 'edit' end);
  if target_category_id is null then
    insert into public.service_categories (organization_id, name, status)
    values (actor.organization_id, left(btrim(category_name), 120), category_status)
    returning * into result;
  else
    update public.service_categories
    set name = left(btrim(category_name), 120), status = category_status
    where id = target_category_id and organization_id = actor.organization_id
    returning * into result;
    if result.id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  end if;
  return result;
exception when unique_violation then raise exception 'CATEGORY_NAME_EXISTS';
end;
$$;

create or replace function public.archive_or_delete_service_category(
  target_category_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.catalog_actor('delete');
begin
  if not exists (
    select 1 from public.service_categories
    where id = target_category_id and organization_id = actor.organization_id
  ) then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if exists (
    select 1 from public.services
    where category_id = target_category_id and organization_id = actor.organization_id
  ) then
    update public.service_categories set status = 'archived'
    where id = target_category_id and organization_id = actor.organization_id;
    update public.services set is_active = false
    where category_id = target_category_id and organization_id = actor.organization_id;
    return 'archived';
  end if;
  delete from public.service_categories
  where id = target_category_id and organization_id = actor.organization_id;
  return 'deleted';
end;
$$;

create or replace function public.upsert_catalog_service(
  target_service_id text,
  service_name text,
  service_category_id uuid,
  service_description text,
  service_duration_minutes integer,
  service_price_bhd numeric,
  service_is_active boolean,
  service_vat_applicable boolean,
  service_staff_keys text[],
  service_branch_ids uuid[]
)
returns public.services
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members;
  result public.services;
  resolved_id text;
begin
  actor := private.catalog_actor(case when target_service_id is null then 'create' else 'edit' end);
  if cardinality(coalesce(service_staff_keys, '{}')) > 200
     or cardinality(coalesce(service_branch_ids, '{}')) > 100 then
    raise exception 'CATALOG_INPUT_INVALID';
  end if;
  if not exists (
    select 1 from public.service_categories
    where id = service_category_id and organization_id = actor.organization_id
      and status = 'active'
  ) then raise exception 'CATEGORY_INVALID'; end if;

  if target_service_id is null then
    insert into public.services (
      organization_id, category_id, name, description, duration_minutes,
      price_bhd, is_active, vat_applicable
    ) values (
      actor.organization_id, service_category_id, left(btrim(service_name), 160),
      left(btrim(coalesce(service_description, '')), 4000),
      service_duration_minutes, round(service_price_bhd, 3),
      service_is_active, service_vat_applicable
    ) returning * into result;
  else
    update public.services set
      category_id = service_category_id,
      name = left(btrim(service_name), 160),
      description = left(btrim(coalesce(service_description, '')), 4000),
      duration_minutes = service_duration_minutes,
      price_bhd = round(service_price_bhd, 3),
      is_active = service_is_active,
      vat_applicable = service_vat_applicable
    where id = target_service_id and organization_id = actor.organization_id
    returning * into result;
    if result.id is null then raise exception 'SERVICE_NOT_FOUND'; end if;
  end if;
  resolved_id := result.id;

  delete from public.service_staff
  where organization_id = actor.organization_id and service_id = resolved_id;
  insert into public.service_staff (organization_id, service_id, membership_id)
  select actor.organization_id, resolved_id, membership.id
  from public.organization_members membership
  where membership.organization_id = actor.organization_id
    and membership.status = 'active'
    and membership.staff_key = any(coalesce(service_staff_keys, '{}'))
  on conflict do nothing;

  update public.organization_members membership
  set service_ids = case
    when membership.staff_key = any(coalesce(service_staff_keys, '{}'))
      then array_append(array_remove(membership.service_ids, resolved_id), resolved_id)
    else array_remove(membership.service_ids, resolved_id)
  end
  where membership.organization_id = actor.organization_id;

  delete from public.service_branches
  where organization_id = actor.organization_id and service_id = resolved_id;
  insert into public.service_branches (organization_id, service_id, branch_id)
  select actor.organization_id, resolved_id, branch.id
  from public.branches branch
  where branch.organization_id = actor.organization_id
    and branch.status = 'active'
    and (
      cardinality(coalesce(service_branch_ids, '{}')) = 0
      or branch.id = any(service_branch_ids)
    )
  on conflict do nothing;
  return result;
exception when unique_violation then raise exception 'SERVICE_NAME_EXISTS';
end;
$$;

create or replace function private.sync_membership_service_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.service_staff assignment
  where assignment.organization_id = new.organization_id
    and assignment.membership_id = new.id
    and not (assignment.service_id = any(new.service_ids));
  insert into public.service_staff (organization_id, service_id, membership_id)
  select new.organization_id, service.id, new.id
  from public.services service
  where service.organization_id = new.organization_id
    and service.id = any(new.service_ids)
  on conflict do nothing;
  return new;
end;
$$;

create trigger organization_members_sync_service_assignments
after update of service_ids on public.organization_members
for each row
when (old.service_ids is distinct from new.service_ids)
execute function private.sync_membership_service_assignments();

create or replace function public.upsert_service_package(
  target_package_id text,
  package_name text,
  package_description text,
  package_kind public.package_type,
  package_selling_price_bhd numeric,
  package_is_active boolean,
  package_allow_price_above_original boolean,
  package_items jsonb
)
returns public.service_packages
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members;
  result public.service_packages;
  resolved_id text;
  original_total numeric;
begin
  actor := private.catalog_actor(case when target_package_id is null then 'create' else 'edit' end);
  if jsonb_typeof(package_items) <> 'array'
     or jsonb_array_length(package_items) < 1
     or jsonb_array_length(package_items) > 100 then
    raise exception 'PACKAGE_ITEMS_INVALID';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(package_items) as item(service_id text, quantity integer, sort_order integer)
    left join public.services service
      on service.id = item.service_id and service.organization_id = actor.organization_id
    where service.id is null or item.quantity not between 1 and 100
      or item.sort_order not between 0 and 999
  ) then raise exception 'PACKAGE_ITEMS_INVALID'; end if;
  if (
    select count(*) <> count(distinct item.service_id)
    from jsonb_to_recordset(package_items) as item(service_id text)
  ) then raise exception 'PACKAGE_ITEMS_DUPLICATE'; end if;

  select coalesce(sum(service.price_bhd * item.quantity), 0)
  into original_total
  from jsonb_to_recordset(package_items) as item(service_id text, quantity integer)
  join public.services service
    on service.id = item.service_id and service.organization_id = actor.organization_id;
  if not package_allow_price_above_original
     and package_selling_price_bhd > original_total then
    raise exception 'PACKAGE_PRICE_TOO_HIGH';
  end if;

  if target_package_id is null then
    insert into public.service_packages (
      organization_id, name, description, type, selling_price_bhd,
      is_active, allow_price_above_original
    ) values (
      actor.organization_id, left(btrim(package_name), 160),
      left(btrim(coalesce(package_description, '')), 4000), package_kind,
      round(package_selling_price_bhd, 3), package_is_active,
      package_allow_price_above_original
    ) returning * into result;
  else
    update public.service_packages set
      name = left(btrim(package_name), 160),
      description = left(btrim(coalesce(package_description, '')), 4000),
      type = package_kind,
      selling_price_bhd = round(package_selling_price_bhd, 3),
      is_active = package_is_active,
      allow_price_above_original = package_allow_price_above_original
    where id = target_package_id and organization_id = actor.organization_id
    returning * into result;
    if result.id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;
  end if;
  resolved_id := result.id;
  delete from public.package_items
  where organization_id = actor.organization_id and package_id = resolved_id;
  insert into public.package_items (
    organization_id, package_id, service_id, quantity, sort_order
  )
  select actor.organization_id, resolved_id, item.service_id, item.quantity, item.sort_order
  from jsonb_to_recordset(package_items)
    as item(service_id text, quantity integer, sort_order integer);
  return result;
exception when unique_violation then raise exception 'PACKAGE_NAME_EXISTS';
end;
$$;

create trigger service_categories_audit_change
after insert or update or delete on public.service_categories
for each row execute function private.audit_business_change();
create trigger services_audit_change
after insert or update or delete on public.services
for each row execute function private.audit_business_change();
create trigger service_packages_audit_change
after insert or update or delete on public.service_packages
for each row execute function private.audit_business_change();

revoke all on function private.catalog_actor(text) from public, anon, authenticated;
revoke all on function private.sync_membership_service_assignments() from public, anon, authenticated;
revoke all on function public.upsert_service_category(uuid, text, public.catalog_status) from public;
revoke all on function public.archive_or_delete_service_category(uuid) from public;
revoke all on function public.upsert_catalog_service(
  text, text, uuid, text, integer, numeric, boolean, boolean, text[], uuid[]
) from public;
revoke all on function public.upsert_service_package(
  text, text, text, public.package_type, numeric, boolean, boolean, jsonb
) from public;
grant execute on function public.upsert_service_category(uuid, text, public.catalog_status) to authenticated;
grant execute on function public.archive_or_delete_service_category(uuid) to authenticated;
grant execute on function public.upsert_catalog_service(
  text, text, uuid, text, integer, numeric, boolean, boolean, text[], uuid[]
) to authenticated;
grant execute on function public.upsert_service_package(
  text, text, text, public.package_type, numeric, boolean, boolean, jsonb
) to authenticated;
