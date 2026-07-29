alter table public.organization_members
  add column staff_key text,
  add column primary_branch_id uuid,
  add column service_ids text[] not null default '{}',
  add column permissions jsonb not null default '{}'::jsonb,
  add column invited_at timestamptz,
  add column accepted_at timestamptz,
  add column last_active_at timestamptz;

update public.organization_members
set staff_key = user_id::text,
    accepted_at = coalesce(accepted_at, created_at),
    primary_branch_id = (
      select branch.id
      from public.branches branch
      where branch.organization_id = organization_members.organization_id
        and branch.is_main
      limit 1
    )
where staff_key is null;

alter table public.organization_members
  alter column staff_key set not null,
  alter column staff_key set default (gen_random_uuid())::text,
  add constraint organization_members_staff_key_format
    check (char_length(btrim(staff_key)) between 1 and 100);

create unique index organization_members_staff_key_unique
  on public.organization_members (organization_id, staff_key);

create unique index organization_members_organization_id_id_unique
  on public.organization_members (organization_id, id);

create unique index branches_organization_id_id_unique
  on public.branches (organization_id, id);

alter table public.organization_members
  add constraint organization_members_primary_branch_tenant_fk
  foreign key (organization_id, primary_branch_id)
  references public.branches (organization_id, id)
  on delete set null (primary_branch_id);

create index organization_members_branch_lookup
  on public.organization_members (organization_id, primary_branch_id)
  where status = 'active';

create table public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  use_custom_hours boolean not null default false,
  days jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, membership_id),
  foreign key (organization_id, membership_id)
    references public.organization_members (organization_id, id)
    on delete cascade
);

create index staff_schedules_organization_lookup
  on public.staff_schedules (organization_id, membership_id);

create table public.staff_time_off (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  foreign key (organization_id, membership_id)
    references public.organization_members (organization_id, id)
    on delete cascade
);

create index staff_time_off_availability_lookup
  on public.staff_time_off (organization_id, membership_id, start_date, end_date);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'System',
  actor_email text,
  action text not null,
  category text not null,
  target_type text,
  target_id text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  old_values jsonb,
  new_values jsonb,
  source text,
  occurred_at timestamptz not null default now()
);

create index activity_logs_organization_time
  on public.activity_logs (organization_id, occurred_at desc);

create index activity_logs_actor_time
  on public.activity_logs (organization_id, actor_user_id, occurred_at desc);

create trigger staff_schedules_set_updated_at
before update on public.staff_schedules
for each row execute function private.set_updated_at();

create trigger staff_time_off_set_updated_at
before update on public.staff_time_off
for each row execute function private.set_updated_at();

create or replace function private.shares_active_organization_with_user(
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members viewer
    join public.organization_members target
      on target.organization_id = viewer.organization_id
    join public.organizations organization
      on organization.id = viewer.organization_id
    where viewer.user_id = (select auth.uid())
      and viewer.status = 'active'
      and target.user_id = target_user_id
      and organization.status = 'active'
  );
$$;

create policy "members can view profiles in their organizations"
on public.profiles
for select
to authenticated
using (private.shares_active_organization_with_user(user_id));

create or replace function public.complete_account_onboarding(
  account_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  membership_record public.organization_members;
  organization_status public.organization_status;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select membership, organization.status
    into membership_record, organization_status
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = current_user_id
  order by membership.created_at
  limit 1;

  if membership_record.id is not null then
    if organization_status = 'deleted' then
      raise exception 'ORGANIZATION_DELETED';
    end if;
    if membership_record.status = 'disabled' then
      raise exception 'MEMBER_DISABLED';
    end if;
    if membership_record.status = 'invited' then
      update public.organization_members
      set status = 'active',
          accepted_at = coalesce(accepted_at, now()),
          last_active_at = now()
      where id = membership_record.id;
    else
      update public.organization_members
      set last_active_at = now()
      where id = membership_record.id;
    end if;

    update public.profiles
    set full_name = coalesce(nullif(btrim(account_full_name), ''), full_name)
    where user_id = current_user_id;

    return membership_record.organization_id;
  end if;

  return private.ensure_owner_onboarding(
    account_full_name,
    null,
    'Main Branch'
  );
end;
$$;

create or replace function public.can_access_application()
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
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and organization.status = 'active'
  );
$$;

create or replace function public.has_module_permission(
  module_name text,
  action_name text
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
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and organization.status = 'active'
      and (
        membership.role in ('owner', 'admin')
        or membership.permissions -> module_name -> action_name = 'true'::jsonb
      )
  );
$$;

create or replace function public.create_team_membership(
  invited_user_id uuid,
  member_full_name text,
  member_email text,
  member_phone text,
  member_role public.organization_role,
  member_branch_id uuid,
  member_service_ids text[],
  member_permissions jsonb
)
returns public.organization_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership public.organization_members;
  invited_auth_email text;
  created_membership public.organization_members;
begin
  select membership.*
    into actor_membership
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and (
      membership.role in ('owner', 'admin')
      or membership.permissions -> 'Team Members' -> 'create' = 'true'::jsonb
    )
    and organization.status = 'active'
  order by membership.created_at
  limit 1;

  if actor_membership.id is null then
    raise exception 'TEAM_MANAGE_FORBIDDEN';
  end if;
  if jsonb_typeof(coalesce(member_permissions, '{}'::jsonb)) <> 'object'
     or cardinality(coalesce(member_service_ids, '{}')) > 200 then
    raise exception 'TEAM_INPUT_INVALID';
  end if;
  if member_role = 'owner' and actor_membership.role <> 'owner' then
    raise exception 'OWNER_ROLE_FORBIDDEN';
  end if;
  if not exists (
    select 1 from public.branches branch
    where branch.id = member_branch_id
      and branch.organization_id = actor_membership.organization_id
      and branch.status = 'active'
  ) then
    raise exception 'TEAM_BRANCH_INVALID';
  end if;

  select lower(auth_user.email)
    into invited_auth_email
  from auth.users auth_user
  where auth_user.id = invited_user_id;

  if invited_auth_email is null
     or invited_auth_email <> lower(btrim(member_email)) then
    raise exception 'TEAM_AUTH_EMAIL_MISMATCH';
  end if;

  insert into public.profiles (user_id, email, full_name, phone)
  values (
    invited_user_id,
    invited_auth_email,
    left(btrim(member_full_name), 160),
    nullif(btrim(member_phone), '')
  )
  on conflict (user_id) do update
  set full_name = excluded.full_name,
      phone = excluded.phone;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    created_by,
    primary_branch_id,
    service_ids,
    permissions,
    invited_at
  )
  values (
    actor_membership.organization_id,
    invited_user_id,
    member_role,
    'invited',
    (select auth.uid()),
    member_branch_id,
    coalesce(member_service_ids, '{}'),
    coalesce(member_permissions, '{}'::jsonb),
    now()
  )
  returning * into created_membership;

  return created_membership;
exception
  when unique_violation then
    raise exception 'TEAM_EMAIL_EXISTS';
end;
$$;

create or replace function public.update_team_membership(
  target_staff_key text,
  member_full_name text,
  member_phone text,
  member_role public.organization_role,
  member_status public.membership_status,
  member_branch_id uuid,
  member_service_ids text[],
  member_permissions jsonb
)
returns public.organization_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership public.organization_members;
  target_membership public.organization_members;
begin
  select membership.*
    into actor_membership
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and (
      membership.role in ('owner', 'admin')
      or membership.permissions -> 'Team Members' -> 'edit' = 'true'::jsonb
    )
    and organization.status = 'active'
  order by membership.created_at
  limit 1;

  if actor_membership.id is null then raise exception 'TEAM_MANAGE_FORBIDDEN'; end if;
  if jsonb_typeof(coalesce(member_permissions, '{}'::jsonb)) <> 'object'
     or cardinality(coalesce(member_service_ids, '{}')) > 200 then
    raise exception 'TEAM_INPUT_INVALID';
  end if;

  select * into target_membership
  from public.organization_members
  where organization_id = actor_membership.organization_id
    and staff_key = target_staff_key
  for update;

  if target_membership.id is null then raise exception 'TEAM_MEMBER_NOT_FOUND'; end if;
  if target_membership.role = 'owner' and actor_membership.role <> 'owner' then
    raise exception 'OWNER_ROLE_FORBIDDEN';
  end if;
  if member_role = 'owner' and actor_membership.role <> 'owner' then
    raise exception 'OWNER_ROLE_FORBIDDEN';
  end if;
  if target_membership.role = 'owner'
     and (member_role <> 'owner' or member_status <> 'active')
     and (
       select count(*)
       from public.organization_members
       where organization_id = actor_membership.organization_id
         and role = 'owner'
         and status = 'active'
     ) <= 1 then
    raise exception 'LAST_OWNER_REQUIRED';
  end if;
  if member_role = 'owner' and member_status <> 'active' then
    raise exception 'OWNER_MUST_BE_ACTIVE';
  end if;
  if not exists (
    select 1 from public.branches branch
    where branch.id = member_branch_id
      and branch.organization_id = actor_membership.organization_id
      and branch.status = 'active'
  ) then
    raise exception 'TEAM_BRANCH_INVALID';
  end if;

  update public.profiles
  set full_name = left(btrim(member_full_name), 160),
      phone = nullif(btrim(member_phone), '')
  where user_id = target_membership.user_id;

  update public.organization_members
  set role = member_role,
      status = member_status,
      primary_branch_id = member_branch_id,
      service_ids = coalesce(member_service_ids, '{}'),
      permissions = coalesce(member_permissions, '{}'::jsonb)
  where id = target_membership.id
  returning * into target_membership;

  return target_membership;
end;
$$;

create or replace function public.disable_team_membership(
  target_staff_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership public.organization_members;
  target_membership public.organization_members;
begin
  select membership.* into actor_membership
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and (
      membership.role in ('owner', 'admin')
      or membership.permissions -> 'Team Members' -> 'delete' = 'true'::jsonb
    )
    and organization.status = 'active'
  order by membership.created_at limit 1;

  if actor_membership.id is null then raise exception 'TEAM_MANAGE_FORBIDDEN'; end if;

  select * into target_membership
  from public.organization_members
  where organization_id = actor_membership.organization_id
    and staff_key = target_staff_key
  for update;

  if target_membership.id is null then raise exception 'TEAM_MEMBER_NOT_FOUND'; end if;
  if target_membership.role = 'owner' then raise exception 'OWNER_REMOVE_FORBIDDEN'; end if;

  update public.organization_members
  set status = 'disabled'
  where id = target_membership.id;
end;
$$;

create or replace function public.record_client_activity(
  activity_action text,
  activity_category text,
  activity_target_type text,
  activity_target_id text,
  activity_description text,
  activity_metadata jsonb,
  activity_old_values jsonb,
  activity_new_values jsonb,
  activity_source text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership public.organization_members;
  actor_profile public.profiles;
  activity_id uuid;
begin
  select membership.* into actor_membership
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organization.status = 'active'
  order by membership.created_at limit 1;
  if actor_membership.id is null then raise exception 'ACTIVITY_FORBIDDEN'; end if;
  if pg_column_size(coalesce(activity_metadata, '{}'::jsonb)) > 32768
     or pg_column_size(coalesce(activity_old_values, 'null'::jsonb)) > 32768
     or pg_column_size(coalesce(activity_new_values, 'null'::jsonb)) > 32768 then
    raise exception 'ACTIVITY_PAYLOAD_TOO_LARGE';
  end if;

  select * into actor_profile
  from public.profiles
  where user_id = (select auth.uid());

  insert into public.activity_logs (
    organization_id, actor_user_id, actor_name, actor_email, action, category,
    target_type, target_id, description, metadata, old_values, new_values, source
  )
  values (
    actor_membership.organization_id,
    (select auth.uid()),
    coalesce(nullif(actor_profile.full_name, ''), 'Team Member'),
    actor_profile.email,
    left(btrim(activity_action), 160),
    left(btrim(activity_category), 80),
    nullif(left(btrim(activity_target_type), 120), ''),
    nullif(left(btrim(activity_target_id), 160), ''),
    nullif(left(btrim(activity_description), 500), ''),
    coalesce(activity_metadata, '{}'::jsonb),
    activity_old_values,
    activity_new_values,
    nullif(left(btrim(activity_source), 120), '')
  )
  returning id into activity_id;
  return activity_id;
end;
$$;

create or replace function private.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  old_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  organization_id_value uuid;
  target_id_value text;
  actor_name_value text;
  actor_email_value text;
begin
  organization_id_value := case
    when tg_table_name = 'organizations'
      then coalesce(new_row ->> 'id', old_row ->> 'id')::uuid
    else coalesce(new_row ->> 'organization_id', old_row ->> 'organization_id')::uuid
  end;
  target_id_value := coalesce(new_row ->> 'id', old_row ->> 'id');

  select profile.full_name, profile.email
    into actor_name_value, actor_email_value
  from public.profiles profile
  where profile.user_id = (select auth.uid());

  insert into public.activity_logs (
    organization_id,
    actor_user_id,
    actor_name,
    actor_email,
    action,
    category,
    target_type,
    target_id,
    description,
    old_values,
    new_values,
    source
  )
  values (
    organization_id_value,
    (select auth.uid()),
    coalesce(nullif(actor_name_value, ''), 'System'),
    actor_email_value,
    initcap(replace(tg_table_name, '_', ' ')) || ' ' || lower(tg_op),
    case
      when tg_table_name in ('organization_members', 'staff_schedules', 'staff_time_off')
        then 'Catalog & Team'
      else 'Settings'
    end,
    replace(tg_table_name, '_', ' '),
    target_id_value,
    tg_op || ' on ' || tg_table_name,
    old_row,
    new_row,
    tg_table_name
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger organizations_audit_change
after insert or update on public.organizations
for each row execute function private.audit_business_change();
create trigger branches_audit_change
after insert or update or delete on public.branches
for each row execute function private.audit_business_change();
create trigger organization_members_audit_change
after insert or update or delete on public.organization_members
for each row execute function private.audit_business_change();
create trigger staff_schedules_audit_change
after insert or update or delete on public.staff_schedules
for each row execute function private.audit_business_change();
create trigger staff_time_off_audit_change
after insert or update or delete on public.staff_time_off
for each row execute function private.audit_business_change();

alter table public.staff_schedules enable row level security;
alter table public.staff_time_off enable row level security;
alter table public.activity_logs enable row level security;

create policy "members can view staff schedules"
on public.staff_schedules for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "managers can insert staff schedules"
on public.staff_schedules for insert to authenticated
with check (private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.organization_role[]
));
create policy "managers can update staff schedules"
on public.staff_schedules for update to authenticated
using (private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.organization_role[]
))
with check (private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.organization_role[]
));

create policy "members can view staff time off"
on public.staff_time_off for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "managers can manage staff time off"
on public.staff_time_off for all to authenticated
using (private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.organization_role[]
))
with check (private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.organization_role[]
));

create policy "members can view activity logs"
on public.activity_logs for select to authenticated
using (private.is_active_organization_member(organization_id));

revoke all on table public.staff_schedules from anon, authenticated;
revoke all on table public.staff_time_off from anon, authenticated;
revoke all on table public.activity_logs from anon, authenticated;
grant select, insert, update on table public.staff_schedules to authenticated;
grant select, insert, update, delete on table public.staff_time_off to authenticated;
grant select on table public.activity_logs to authenticated;

revoke all on function public.complete_account_onboarding(text) from public;
revoke all on function public.can_access_application() from public;
revoke all on function public.has_module_permission(text, text) from public;
revoke all on function public.create_team_membership(
  uuid, text, text, text, public.organization_role, uuid, text[], jsonb
) from public;
revoke all on function public.update_team_membership(
  text, text, text, public.organization_role, public.membership_status,
  uuid, text[], jsonb
) from public;
revoke all on function public.disable_team_membership(text) from public;
revoke all on function public.record_client_activity(
  text, text, text, text, text, jsonb, jsonb, jsonb, text
) from public;

grant execute on function public.complete_account_onboarding(text) to authenticated;
grant execute on function public.can_access_application() to authenticated;
grant execute on function public.has_module_permission(text, text) to authenticated;
grant execute on function public.create_team_membership(
  uuid, text, text, text, public.organization_role, uuid, text[], jsonb
) to authenticated;
grant execute on function public.update_team_membership(
  text, text, text, public.organization_role, public.membership_status,
  uuid, text[], jsonb
) to authenticated;
grant execute on function public.disable_team_membership(text) to authenticated;
grant execute on function public.record_client_activity(
  text, text, text, text, text, jsonb, jsonb, jsonb, text
) to authenticated;

comment on table public.activity_logs is
  'Persistent tenant-scoped audit history. Direct writes are not granted to application roles.';
comment on table public.staff_time_off is
  'Approved staff leave and day-off ranges used by appointment availability.';
