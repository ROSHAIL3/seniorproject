alter table public.organizations
  add column business_email text,
  add column business_phone text,
  add column address text,
  add column website text,
  add column public_booking_enabled boolean not null default false,
  add column logo_object_path text,
  add column logo_file_name text,
  add column logo_mime_type text,
  add column logo_size_bytes bigint;

alter table public.organizations
  add constraint organizations_business_email_format
    check (
      business_email is null
      or business_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  add constraint organizations_website_format
    check (
      website is null
      or website ~* '^https?://[^[:space:]]+$'
    ),
  add constraint organizations_logo_metadata_complete
    check (
      (
        logo_object_path is null
        and logo_file_name is null
        and logo_mime_type is null
        and logo_size_bytes is null
      )
      or (
        logo_object_path is not null
        and logo_file_name is not null
        and logo_mime_type in ('image/png', 'image/jpeg', 'image/webp')
        and logo_size_bytes between 1 and 2097152
      )
    );

create unique index branches_organization_name_unique
  on public.branches (organization_id, lower(btrim(name)));

create index branches_organization_status_created
  on public.branches (organization_id, status, created_at);

alter table public.branches
  add constraint main_branch_must_be_active
    check (not is_main or status = 'active');

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
    join public.organizations organization
      on organization.id = membership.organization_id
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and organization.status = 'active'
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
    join public.organizations organization
      on organization.id = membership.organization_id
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
      and organization.status = 'active'
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
  existing_organization_status public.organization_status;
  new_organization_id uuid := gen_random_uuid();
  normalized_full_name text;
  normalized_organization_name text;
  normalized_branch_name text;
  generated_slug text;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select membership.organization_id, organization.status
    into existing_organization_id, existing_organization_status
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = current_user_id
  order by membership.created_at
  limit 1;

  if existing_organization_id is not null then
    if existing_organization_status = 'deleted' then
      raise exception 'ORGANIZATION_DELETED';
    end if;

    return existing_organization_id;
  end if;

  select coalesce(auth_user.email, '')
    into current_email
  from auth.users auth_user
  where auth_user.id = current_user_id;

  normalized_full_name := left(
    coalesce(nullif(btrim(owner_full_name), ''), 'Slotova Owner'),
    160
  );
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
    business_email,
    created_by
  )
  values (
    new_organization_id,
    normalized_organization_name,
    generated_slug,
    'BH',
    'BHD',
    'Asia/Bahrain',
    nullif(current_email, ''),
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

create or replace function public.upsert_branch(
  target_branch_id uuid,
  branch_name text,
  branch_phone text,
  branch_email text,
  branch_address text,
  branch_google_maps_url text,
  branch_time_zone text,
  branch_status public.branch_status,
  make_main boolean
)
returns public.branches
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_organization_id uuid;
  current_branch public.branches;
  saved_branch public.branches;
  generated_prefix text;
  generated_code text;
  next_number integer;
  normalized_name text := btrim(branch_name);
begin
  select membership.organization_id
    into current_organization_id
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'manager')
    and organization.status = 'active'
  order by membership.created_at
  limit 1;

  if current_organization_id is null then
    raise exception 'BRANCH_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_organization_id::text, 0)
  );

  if normalized_name = '' or char_length(normalized_name) > 120 then
    raise exception 'BRANCH_NAME_INVALID';
  end if;

  if make_main and branch_status <> 'active' then
    raise exception 'MAIN_BRANCH_MUST_BE_ACTIVE';
  end if;

  if target_branch_id is null then
    generated_prefix := upper(left(
      regexp_replace(normalized_name, '[^a-zA-Z0-9]', '', 'g'),
      3
    ));
    generated_prefix := rpad(
      coalesce(nullif(generated_prefix, ''), 'BRN'),
      3,
      'X'
    );

    select coalesce(max(
      case
        when code ~ '-[0-9]+$'
          then substring(code from '([0-9]+)$')::integer
        else 0
      end
    ), 0) + 1
      into next_number
    from public.branches
    where organization_id = current_organization_id;

    generated_code := generated_prefix || '-' || lpad(next_number::text, 3, '0');

    if not exists (
      select 1
      from public.branches
      where organization_id = current_organization_id
        and status <> 'archived'
    ) then
      make_main := true;
    end if;

    if make_main then
      update public.branches
      set is_main = false
      where organization_id = current_organization_id
        and is_main;
    end if;

    insert into public.branches (
      organization_id,
      name,
      code,
      phone,
      email,
      address,
      google_maps_url,
      time_zone,
      status,
      is_main
    )
    values (
      current_organization_id,
      normalized_name,
      generated_code,
      nullif(btrim(branch_phone), ''),
      nullif(lower(btrim(branch_email)), ''),
      nullif(btrim(branch_address), ''),
      nullif(btrim(branch_google_maps_url), ''),
      branch_time_zone,
      branch_status,
      make_main
    )
    returning * into saved_branch;
  else
    select *
      into current_branch
    from public.branches
    where id = target_branch_id
      and organization_id = current_organization_id
    for update;

    if current_branch.id is null then
      raise exception 'BRANCH_NOT_FOUND';
    end if;

    if current_branch.is_main and not make_main then
      raise exception 'MAIN_BRANCH_REASSIGN_REQUIRED';
    end if;

    if current_branch.is_main and branch_status <> 'active' then
      raise exception 'MAIN_BRANCH_MUST_BE_ACTIVE';
    end if;

    if make_main then
      update public.branches
      set is_main = false
      where organization_id = current_organization_id
        and id <> target_branch_id
        and is_main;
    end if;

    update public.branches
    set name = normalized_name,
        phone = nullif(btrim(branch_phone), ''),
        email = nullif(lower(btrim(branch_email)), ''),
        address = nullif(btrim(branch_address), ''),
        google_maps_url = nullif(btrim(branch_google_maps_url), ''),
        time_zone = branch_time_zone,
        status = branch_status,
        is_main = make_main
    where id = target_branch_id
      and organization_id = current_organization_id
    returning * into saved_branch;
  end if;

  return saved_branch;
exception
  when unique_violation then
    raise exception 'BRANCH_NAME_OR_CODE_EXISTS';
end;
$$;

create or replace function public.delete_branch(target_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_organization_id uuid;
  current_branch public.branches;
begin
  select membership.organization_id
    into current_organization_id
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
    and organization.status = 'active'
  order by membership.created_at
  limit 1;

  if current_organization_id is null then
    raise exception 'BRANCH_DELETE_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_organization_id::text, 0)
  );

  select *
    into current_branch
  from public.branches
  where id = target_branch_id
    and organization_id = current_organization_id
  for update;

  if current_branch.id is null then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  if current_branch.is_main then
    raise exception 'MAIN_BRANCH_DELETE_FORBIDDEN';
  end if;

  delete from public.branches
  where id = target_branch_id
    and organization_id = current_organization_id;
end;
$$;

create or replace function public.soft_delete_organization(
  confirmation_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_organization public.organizations;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select organization.*
    into target_organization
  from public.organizations organization
  join public.organization_members membership
    on membership.organization_id = organization.id
  where membership.user_id = current_user_id
    and membership.status = 'active'
    and membership.role = 'owner'
    and organization.status = 'active'
  order by membership.created_at
  limit 1
  for update of organization;

  if target_organization.id is null then
    raise exception 'ORGANIZATION_DELETE_FORBIDDEN';
  end if;

  if confirmation_name is distinct from target_organization.name then
    raise exception 'ORGANIZATION_NAME_MISMATCH';
  end if;

  update public.organizations
  set status = 'deleted'
  where id = target_organization.id;

  return target_organization.id;
end;
$$;

create or replace function public.is_organization_business_email_verified(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_organization_member(target_organization_id)
    and exists (
      select 1
      from public.organizations organization
      join public.organization_members owner_membership
        on owner_membership.organization_id = organization.id
      join auth.users owner_user
        on owner_user.id = owner_membership.user_id
      where organization.id = target_organization_id
        and owner_membership.role = 'owner'
        and owner_membership.status = 'active'
        and owner_user.email_confirmed_at is not null
        and lower(owner_user.email) = lower(organization.business_email)
    );
$$;

revoke all on function public.upsert_branch(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  public.branch_status,
  boolean
) from public;
revoke all on function public.delete_branch(uuid) from public;
revoke all on function public.soft_delete_organization(text) from public;
revoke all on function public.is_organization_business_email_verified(uuid)
  from public;

grant execute on function public.upsert_branch(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  public.branch_status,
  boolean
) to authenticated;
grant execute on function public.delete_branch(uuid) to authenticated;
grant execute on function public.soft_delete_organization(text) to authenticated;
grant execute on function public.is_organization_business_email_verified(uuid)
  to authenticated;

revoke insert, update, delete on table public.branches from authenticated;
grant select on table public.branches to authenticated;

grant update (
  name,
  slug,
  country_code,
  currency_code,
  time_zone,
  business_email,
  business_phone,
  address,
  website,
  public_booking_enabled,
  logo_object_path,
  logo_file_name,
  logo_mime_type,
  logo_size_bytes
) on table public.organizations to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'organization-logos',
  'organization-logos',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "organization members can read logos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'organization-logos'
  and name = (storage.foldername(name))[1] || '/logo'
  and (storage.foldername(name))[1] ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.is_active_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "organization admins can upload logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organization-logos'
  and name = (storage.foldername(name))[1] || '/logo'
  and (storage.foldername(name))[1] ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "organization admins can update logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organization-logos'
  and name = (storage.foldername(name))[1] || '/logo'
  and (storage.foldername(name))[1] ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  bucket_id = 'organization-logos'
  and name = (storage.foldername(name))[1] || '/logo'
  and (storage.foldername(name))[1] ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "organization admins can delete logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'organization-logos'
  and name = (storage.foldername(name))[1] || '/logo'
  and (storage.foldername(name))[1] ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']::public.organization_role[]
  )
);

comment on function public.upsert_branch(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  public.branch_status,
  boolean
) is
  'Atomically creates or updates a branch while preserving tenant and main-branch invariants.';

comment on function public.soft_delete_organization(text) is
  'Owner-only soft deletion. Retained data becomes inaccessible to tenant sessions.';
