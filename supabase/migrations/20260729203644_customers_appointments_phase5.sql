create type public.customer_status as enum ('active', 'inactive');
create type public.appointment_status as enum (
  'booked', 'confirmed', 'completed', 'cancelled', 'no_show'
);
create type public.appointment_offering_type as enum ('service', 'package');

create table public.organization_business_hours (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  break_start_time time,
  break_end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, day_of_week),
  check (not is_open or end_time > start_time),
  check (
    (break_start_time is null and break_end_time is null)
    or (
      break_start_time is not null
      and break_end_time is not null
      and break_end_time > break_start_time
    )
  )
);

insert into public.organization_business_hours (
  organization_id, day_of_week, is_open
)
select organization.id, day_number, day_number <> 0
from public.organizations organization
cross join generate_series(0, 6) day_number
on conflict do nothing;

create or replace function private.initialize_business_hours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_business_hours (
    organization_id, day_of_week, is_open
  )
  select new.id, day_number, day_number <> 0
  from generate_series(0, 6) day_number;
  return new;
end;
$$;

create trigger organizations_initialize_business_hours
after insert on public.organizations
for each row execute function private.initialize_business_hours();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  phone text not null check (char_length(btrim(phone)) between 3 and 40),
  normalized_phone text not null check (char_length(normalized_phone) between 3 and 40),
  email text not null default '' check (char_length(email) <= 320),
  notes text not null default '' check (char_length(notes) <= 10000),
  status public.customer_status not null default 'active',
  custom_values jsonb not null default '{}'::jsonb
    check (jsonb_typeof(custom_values) = 'object' and pg_column_size(custom_values) <= 32768),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index customers_phone_unique
  on public.customers (organization_id, normalized_phone);
create unique index customers_email_unique
  on public.customers (organization_id, lower(email))
  where email <> '';
create index customers_list_lookup
  on public.customers (organization_id, status, name);

create table public.organization_booking_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  next_number bigint not null default 1 check (next_number > 0)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_number text not null,
  customer_id uuid not null,
  membership_id uuid not null,
  branch_id uuid not null,
  offering_type public.appointment_offering_type not null,
  service_id text,
  package_id text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  staff_name text not null,
  offering_name text not null,
  package_type public.package_type,
  price_bhd numeric(12,3) not null check (price_bhd between 0 and 999999999.999),
  status public.appointment_status not null default 'booked',
  notes text not null default '' check (char_length(notes) <= 10000),
  service_field_values jsonb not null default '{}'::jsonb
    check (jsonb_typeof(service_field_values) = 'object' and pg_column_size(service_field_values) <= 32768),
  advance_paid_bhd numeric(12,3) not null default 0
    check (advance_paid_bhd between 0 and 999999999.999),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, booking_number),
  check (ends_at > starts_at),
  check (
    (offering_type = 'service' and service_id is not null and package_id is null and package_type is null)
    or
    (offering_type = 'package' and package_id is not null and service_id is null and package_type is not null)
  ),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  foreign key (organization_id, membership_id)
    references public.organization_members (organization_id, id) on delete restrict,
  foreign key (organization_id, branch_id)
    references public.branches (organization_id, id) on delete restrict,
  foreign key (organization_id, service_id)
    references public.services (organization_id, id) on delete restrict,
  foreign key (organization_id, package_id)
    references public.service_packages (organization_id, id) on delete restrict
);

create index appointments_calendar_lookup
  on public.appointments (organization_id, starts_at, ends_at);
create index appointments_staff_conflict_lookup
  on public.appointments (organization_id, membership_id, starts_at, ends_at)
  where status <> 'cancelled';
create index appointments_customer_conflict_lookup
  on public.appointments (organization_id, customer_id, starts_at, ends_at)
  where status <> 'cancelled';

create table public.appointment_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null,
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, appointment_id)
    references public.appointments (organization_id, id) on delete cascade
);

create index appointment_notes_timeline
  on public.appointment_notes (organization_id, appointment_id, created_at desc);

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null,
  old_status public.appointment_status,
  new_status public.appointment_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  foreign key (organization_id, appointment_id)
    references public.appointments (organization_id, id) on delete cascade
);

create index appointment_status_history_timeline
  on public.appointment_status_history (
    organization_id, appointment_id, changed_at desc
  );

create trigger organization_business_hours_set_updated_at
before update on public.organization_business_hours
for each row execute function private.set_updated_at();
create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function private.set_updated_at();

create or replace function private.current_active_membership()
returns public.organization_members
language sql
stable
security definer
set search_path = ''
as $$
  select membership
  from public.organization_members membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organization.status = 'active'
  order by membership.created_at
  limit 1;
$$;

create or replace function private.can_module(
  membership public.organization_members,
  module_name text,
  action_name text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (membership).role in ('owner', 'admin')
    or (membership).permissions -> module_name -> action_name = 'true'::jsonb;
$$;

create or replace function private.normalized_phone(phone_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(coalesce(phone_value, ''), '[^0-9+]', '', 'g');
$$;

create or replace function private.validate_appointment_slot(
  actor_membership public.organization_members,
  target_appointment_id uuid,
  target_customer_id uuid,
  target_staff_key text,
  target_branch_id uuid,
  target_offering_id text,
  target_starts_at timestamptz,
  target_ends_at timestamptz
)
returns table (
  selected_customer public.customers,
  selected_staff public.organization_members,
  offering_type public.appointment_offering_type,
  selected_service public.services,
  selected_package public.service_packages,
  duration_minutes integer,
  price_bhd numeric,
  offering_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_start timestamp;
  local_end timestamp;
  local_day smallint;
  business_day public.organization_business_hours;
  schedule_days jsonb;
  staff_day jsonb;
  lock_one bigint;
  lock_two bigint;
begin
  if actor_membership.id is null then raise exception 'AUTH_REQUIRED'; end if;
  if target_ends_at <= target_starts_at or target_starts_at <= now() then
    raise exception 'APPOINTMENT_PAST_OR_DURATION';
  end if;

  lock_one := hashtextextended(
    actor_membership.organization_id::text || ':customer:' || target_customer_id::text, 0
  );
  lock_two := hashtextextended(
    actor_membership.organization_id::text || ':staff:' || target_staff_key, 0
  );
  perform pg_advisory_xact_lock(least(lock_one, lock_two));
  perform pg_advisory_xact_lock(greatest(lock_one, lock_two));

  select customer.* into selected_customer
  from public.customers customer
  where customer.organization_id = actor_membership.organization_id
    and customer.id = target_customer_id
    and customer.status = 'active';
  if selected_customer.id is null then raise exception 'CUSTOMER_INVALID'; end if;

  select membership.* into selected_staff
  from public.organization_members membership
  where membership.organization_id = actor_membership.organization_id
    and membership.staff_key = target_staff_key
    and membership.status = 'active';
  if selected_staff.id is null then raise exception 'STAFF_INVALID'; end if;
  if selected_staff.primary_branch_id is distinct from target_branch_id then
    raise exception 'STAFF_BRANCH_CONFLICT';
  end if;
  if not exists (
    select 1 from public.branches branch
    where branch.organization_id = actor_membership.organization_id
      and branch.id = target_branch_id and branch.status = 'active'
  ) then raise exception 'BRANCH_INVALID'; end if;

  select service.* into selected_service
  from public.services service
  join public.service_categories category
    on category.organization_id = service.organization_id
   and category.id = service.category_id
  where service.organization_id = actor_membership.organization_id
    and service.id = target_offering_id
    and service.is_active and category.status = 'active';

  if selected_service.id is not null then
    offering_type := 'service';
    duration_minutes := selected_service.duration_minutes;
    price_bhd := selected_service.price_bhd;
    offering_name := selected_service.name;
    if not exists (
      select 1 from public.service_branches assignment
      where assignment.organization_id = actor_membership.organization_id
        and assignment.service_id = selected_service.id
        and assignment.branch_id = target_branch_id
    ) then raise exception 'SERVICE_BRANCH_INVALID'; end if;
    if not exists (
      select 1 from public.service_staff assignment
      where assignment.organization_id = actor_membership.organization_id
        and assignment.service_id = selected_service.id
        and assignment.membership_id = selected_staff.id
    ) then raise exception 'STAFF_SERVICE_INVALID'; end if;
  else
    select package.* into selected_package
    from public.service_packages package
    where package.organization_id = actor_membership.organization_id
      and package.id = target_offering_id and package.is_active;
    if selected_package.id is null then raise exception 'OFFERING_INVALID'; end if;
    offering_type := 'package';
    select coalesce(sum(service.duration_minutes * item.quantity), 0)::integer
      into duration_minutes
    from public.package_items item
    join public.services service
      on service.organization_id = item.organization_id
     and service.id = item.service_id
    where item.organization_id = actor_membership.organization_id
      and item.package_id = selected_package.id
      and service.is_active;
    if duration_minutes <= 0 then raise exception 'PACKAGE_INVALID'; end if;
    price_bhd := selected_package.selling_price_bhd;
    offering_name := selected_package.name;
    if exists (
      select 1
      from public.package_items item
      where item.organization_id = actor_membership.organization_id
        and item.package_id = selected_package.id
        and (
          not exists (
            select 1 from public.service_branches branch_assignment
            where branch_assignment.organization_id = item.organization_id
              and branch_assignment.service_id = item.service_id
              and branch_assignment.branch_id = target_branch_id
          )
          or not exists (
            select 1 from public.service_staff staff_assignment
            where staff_assignment.organization_id = item.organization_id
              and staff_assignment.service_id = item.service_id
              and staff_assignment.membership_id = selected_staff.id
          )
        )
    ) then raise exception 'PACKAGE_ASSIGNMENT_INVALID'; end if;
  end if;

  if target_ends_at <> target_starts_at + make_interval(mins => duration_minutes) then
    raise exception 'SERVICE_DURATION_INVALID';
  end if;
  if target_starts_at::date <> target_ends_at::date then
    raise exception 'APPOINTMENT_CROSSES_DAY';
  end if;

  local_start := target_starts_at at time zone 'Asia/Bahrain';
  local_end := target_ends_at at time zone 'Asia/Bahrain';
  local_day := extract(dow from local_start)::smallint;
  select hours.* into business_day
  from public.organization_business_hours hours
  where hours.organization_id = actor_membership.organization_id
    and hours.day_of_week = local_day;
  if business_day.organization_id is null or not business_day.is_open
    or local_start::time < business_day.start_time
    or local_end::time > business_day.end_time then
    raise exception 'BUSINESS_HOURS_CONFLICT';
  end if;
  if business_day.break_start_time is not null
    and local_start::time < business_day.break_end_time
    and local_end::time > business_day.break_start_time then
    raise exception 'BUSINESS_BREAK_CONFLICT';
  end if;

  select schedule.days into schedule_days
  from public.staff_schedules schedule
  where schedule.organization_id = actor_membership.organization_id
    and schedule.membership_id = selected_staff.id
    and schedule.use_custom_hours;
  if schedule_days is not null then
    select day_value into staff_day
    from jsonb_array_elements(schedule_days) day_value
    where (day_value ->> 'dayOfWeek')::integer = local_day
    limit 1;
    if staff_day is null or coalesce((staff_day ->> 'isOpen')::boolean, false) = false then
      raise exception 'STAFF_DAY_OFF';
    end if;
    if local_start::time < (staff_day ->> 'startTime')::time
      or local_end::time > (staff_day ->> 'endTime')::time then
      raise exception 'STAFF_HOURS_CONFLICT';
    end if;
    if nullif(staff_day ->> 'breakStartTime', '') is not null
      and local_start::time < (staff_day ->> 'breakEndTime')::time
      and local_end::time > (staff_day ->> 'breakStartTime')::time then
      raise exception 'STAFF_BREAK_CONFLICT';
    end if;
  end if;

  if exists (
    select 1 from public.staff_time_off leave
    where leave.organization_id = actor_membership.organization_id
      and leave.membership_id = selected_staff.id
      and local_start::date between leave.start_date and leave.end_date
  ) then raise exception 'STAFF_TIME_OFF'; end if;

  if exists (
    select 1 from public.appointments appointment
    where appointment.organization_id = actor_membership.organization_id
      and appointment.id is distinct from target_appointment_id
      and appointment.status <> 'cancelled'
      and appointment.membership_id = selected_staff.id
      and appointment.starts_at < target_ends_at
      and appointment.ends_at > target_starts_at
  ) then raise exception 'STAFF_CONFLICT'; end if;
  if exists (
    select 1 from public.appointments appointment
    where appointment.organization_id = actor_membership.organization_id
      and appointment.id is distinct from target_appointment_id
      and appointment.status <> 'cancelled'
      and appointment.customer_id = selected_customer.id
      and appointment.starts_at < target_ends_at
      and appointment.ends_at > target_starts_at
  ) then raise exception 'CUSTOMER_CONFLICT'; end if;

  return next;
end;
$$;

create or replace function public.upsert_customer(
  target_customer_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_notes text,
  customer_status public.customer_status,
  customer_custom_values jsonb
)
returns public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.customers;
  required_action text := case when target_customer_id is null then 'create' else 'edit' end;
begin
  if actor.id is null or not private.can_module(actor, 'Customers', required_action) then
    raise exception 'CUSTOMER_FORBIDDEN';
  end if;
  if char_length(btrim(customer_name)) not between 1 and 160
    or char_length(private.normalized_phone(customer_phone)) not between 3 and 40
    or char_length(coalesce(customer_email, '')) > 320
    or jsonb_typeof(coalesce(customer_custom_values, '{}'::jsonb)) <> 'object'
    or pg_column_size(coalesce(customer_custom_values, '{}'::jsonb)) > 32768 then
    raise exception 'CUSTOMER_INVALID';
  end if;
  if target_customer_id is null then
    insert into public.customers (
      organization_id, name, phone, normalized_phone, email, notes, status,
      custom_values, created_by
    ) values (
      actor.organization_id, btrim(customer_name), btrim(customer_phone),
      private.normalized_phone(customer_phone), lower(btrim(coalesce(customer_email, ''))),
      btrim(coalesce(customer_notes, '')), coalesce(customer_status, 'active'),
      coalesce(customer_custom_values, '{}'::jsonb), (select auth.uid())
    ) returning * into result;
  else
    update public.customers set
      name = btrim(customer_name),
      phone = btrim(customer_phone),
      normalized_phone = private.normalized_phone(customer_phone),
      email = lower(btrim(coalesce(customer_email, ''))),
      notes = btrim(coalesce(customer_notes, '')),
      status = customer_status,
      custom_values = coalesce(customer_custom_values, '{}'::jsonb)
    where organization_id = actor.organization_id and id = target_customer_id
    returning * into result;
    if result.id is null then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  end if;
  return result;
exception when unique_violation then
  raise exception 'CUSTOMER_DUPLICATE';
end;
$$;

create or replace function public.update_business_hours(schedule_days jsonb)
returns setof public.organization_business_hours
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
begin
  if actor.id is null or not private.can_module(actor, 'Settings', 'edit') then
    raise exception 'SETTINGS_FORBIDDEN';
  end if;
  if jsonb_typeof(schedule_days) <> 'array'
    or jsonb_array_length(schedule_days) <> 7
    or (
      select count(distinct (day_value ->> 'dayOfWeek')::integer)
      from jsonb_array_elements(schedule_days) day_value
      where (day_value ->> 'dayOfWeek')::integer between 0 and 6
    ) <> 7 then
    raise exception 'BUSINESS_HOURS_INVALID';
  end if;

  insert into public.organization_business_hours (
    organization_id, day_of_week, is_open, start_time, end_time,
    break_start_time, break_end_time
  )
  select
    actor.organization_id,
    (day_value ->> 'dayOfWeek')::smallint,
    (day_value ->> 'isOpen')::boolean,
    (day_value ->> 'startTime')::time,
    (day_value ->> 'endTime')::time,
    nullif(day_value ->> 'breakStartTime', '')::time,
    nullif(day_value ->> 'breakEndTime', '')::time
  from jsonb_array_elements(schedule_days) day_value
  on conflict (organization_id, day_of_week) do update
  set is_open = excluded.is_open,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      break_start_time = excluded.break_start_time,
      break_end_time = excluded.break_end_time;

  return query
  select *
  from public.organization_business_hours hours
  where hours.organization_id = actor.organization_id
  order by hours.day_of_week;
exception
  when check_violation or invalid_text_representation then
    raise exception 'BUSINESS_HOURS_INVALID';
end;
$$;

create or replace function public.delete_customer(target_customer_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare actor public.organization_members := private.current_active_membership();
begin
  if actor.id is null or not private.can_module(actor, 'Customers', 'delete') then
    raise exception 'CUSTOMER_FORBIDDEN';
  end if;
  if exists (
    select 1 from public.appointments
    where organization_id = actor.organization_id and customer_id = target_customer_id
  ) then
    update public.customers set status = 'inactive'
    where organization_id = actor.organization_id and id = target_customer_id;
    return 'archived';
  end if;
  delete from public.customers
  where organization_id = actor.organization_id and id = target_customer_id;
  if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  return 'deleted';
end;
$$;

create or replace function public.upsert_appointment(
  target_appointment_id uuid,
  target_customer_id uuid,
  target_staff_key text,
  target_branch_id uuid,
  target_offering_id text,
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_status public.appointment_status,
  target_notes text,
  target_service_field_values jsonb,
  target_created_by_name text
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  validation record;
  result public.appointments;
  next_booking_number bigint;
  required_action text := case when target_appointment_id is null then 'create' else 'edit' end;
begin
  if actor.id is null or not private.can_module(actor, 'Appointments', required_action) then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  if target_status is null or jsonb_typeof(coalesce(target_service_field_values, '{}'::jsonb)) <> 'object'
    or pg_column_size(coalesce(target_service_field_values, '{}'::jsonb)) > 32768 then
    raise exception 'APPOINTMENT_INVALID';
  end if;
  select * into validation
  from private.validate_appointment_slot(
    actor, target_appointment_id, target_customer_id, target_staff_key,
    target_branch_id, target_offering_id, target_starts_at, target_ends_at
  );

  if target_appointment_id is null then
    insert into public.organization_booking_counters (organization_id, next_number)
    values (actor.organization_id, 2)
    on conflict (organization_id) do update
      set next_number = public.organization_booking_counters.next_number + 1
    returning next_number - 1 into next_booking_number;

    insert into public.appointments (
      organization_id, booking_number, customer_id, membership_id, branch_id,
      offering_type, service_id, package_id, starts_at, ends_at,
      customer_name, customer_phone, customer_email, staff_name, offering_name,
      package_type, price_bhd, status, notes, service_field_values,
      created_by, created_by_name
    ) values (
      actor.organization_id, 'BK-' || lpad(next_booking_number::text, 6, '0'),
      validation.selected_customer.id, validation.selected_staff.id, target_branch_id,
      validation.offering_type,
      case when validation.offering_type = 'service' then validation.selected_service.id end,
      case when validation.offering_type = 'package' then validation.selected_package.id end,
      target_starts_at, target_ends_at,
      validation.selected_customer.name, validation.selected_customer.phone,
      validation.selected_customer.email,
      coalesce((select full_name from public.profiles where user_id = validation.selected_staff.user_id), 'Team Member'),
      validation.offering_name,
      case when validation.offering_type = 'package' then validation.selected_package.type end,
      validation.price_bhd, target_status, btrim(coalesce(target_notes, '')),
      coalesce(target_service_field_values, '{}'::jsonb),
      (select auth.uid()), coalesce(nullif(btrim(target_created_by_name), ''), 'System')
    ) returning * into result;
  else
    update public.appointments set
      customer_id = validation.selected_customer.id,
      membership_id = validation.selected_staff.id,
      branch_id = target_branch_id,
      offering_type = validation.offering_type,
      service_id = case when validation.offering_type = 'service' then validation.selected_service.id end,
      package_id = case when validation.offering_type = 'package' then validation.selected_package.id end,
      starts_at = target_starts_at,
      ends_at = target_ends_at,
      customer_name = validation.selected_customer.name,
      customer_phone = validation.selected_customer.phone,
      customer_email = validation.selected_customer.email,
      staff_name = coalesce((select full_name from public.profiles where user_id = validation.selected_staff.user_id), 'Team Member'),
      offering_name = validation.offering_name,
      package_type = case when validation.offering_type = 'package' then validation.selected_package.type end,
      price_bhd = validation.price_bhd,
      status = target_status,
      notes = btrim(coalesce(target_notes, '')),
      service_field_values = coalesce(target_service_field_values, '{}'::jsonb)
    where organization_id = actor.organization_id and id = target_appointment_id
    returning * into result;
    if result.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  end if;
  return result;
end;
$$;

create or replace function public.update_appointment_status(
  target_appointment_id uuid,
  target_status public.appointment_status
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.appointments;
  current_appointment public.appointments;
  staff_key_value text;
  previous_status public.appointment_status;
begin
  if actor.id is null or not private.can_module(actor, 'Appointments', 'edit') then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  select * into current_appointment from public.appointments
  where organization_id = actor.organization_id and id = target_appointment_id
  for update;
  previous_status := current_appointment.status;
  if previous_status is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if previous_status = 'cancelled' and target_status in ('booked', 'confirmed') then
    select staff_key into staff_key_value
    from public.organization_members
    where organization_id = actor.organization_id
      and id = current_appointment.membership_id;
    perform 1
    from private.validate_appointment_slot(
      actor,
      current_appointment.id,
      current_appointment.customer_id,
      staff_key_value,
      current_appointment.branch_id,
      coalesce(current_appointment.service_id, current_appointment.package_id),
      current_appointment.starts_at,
      current_appointment.ends_at
    );
  end if;
  update public.appointments set status = target_status
  where organization_id = actor.organization_id and id = target_appointment_id
  returning * into result;
  if previous_status <> target_status then
    insert into public.appointment_status_history (
      organization_id, appointment_id, old_status, new_status, changed_by
    ) values (
      actor.organization_id, target_appointment_id, previous_status,
      target_status, (select auth.uid())
    );
  end if;
  return result;
end;
$$;

create or replace function public.update_appointment_payment(
  target_appointment_id uuid,
  target_amount_bhd numeric
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.appointments;
begin
  if actor.id is null or not private.can_module(actor, 'Appointments', 'edit') then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  if target_amount_bhd < 0 then raise exception 'PAYMENT_INVALID'; end if;
  update public.appointments set advance_paid_bhd = target_amount_bhd
  where organization_id = actor.organization_id and id = target_appointment_id
  returning * into result;
  if result.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  return result;
end;
$$;

create or replace function public.add_appointment_note(
  target_appointment_id uuid,
  target_note text
)
returns public.appointment_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.appointment_notes;
begin
  if actor.id is null or not private.can_module(actor, 'Appointments', 'edit') then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  if char_length(btrim(target_note)) not between 1 and 4000 then
    raise exception 'NOTE_INVALID';
  end if;
  if not exists (
    select 1 from public.appointments
    where organization_id = actor.organization_id and id = target_appointment_id
  ) then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  insert into public.appointment_notes (
    organization_id, appointment_id, note, created_by
  ) values (
    actor.organization_id, target_appointment_id, btrim(target_note), (select auth.uid())
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.delete_appointment(target_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor public.organization_members := private.current_active_membership();
begin
  if actor.id is null or not private.can_module(actor, 'Appointments', 'delete') then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  delete from public.appointments
  where organization_id = actor.organization_id and id = target_appointment_id;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
end;
$$;

create or replace function private.record_initial_appointment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.appointment_status_history (
    organization_id, appointment_id, new_status, changed_by
  ) values (new.organization_id, new.id, new.status, (select auth.uid()));
  return new;
end;
$$;

create trigger appointments_initial_status
after insert on public.appointments
for each row execute function private.record_initial_appointment_status();
create trigger customers_audit_change
after insert or update or delete on public.customers
for each row execute function private.audit_business_change();
create trigger appointments_audit_change
after insert or update or delete on public.appointments
for each row execute function private.audit_business_change();
create trigger organization_business_hours_audit_change
after update on public.organization_business_hours
for each row execute function private.audit_business_change();

alter table public.organization_business_hours enable row level security;
alter table public.customers enable row level security;
alter table public.organization_booking_counters enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.appointment_status_history enable row level security;

create policy "members can view business hours"
on public.organization_business_hours for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "members can view customers"
on public.customers for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Customers', 'view'))
);
create policy "members can view appointments"
on public.appointments for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (
    (select public.has_module_permission('Appointments', 'view'))
    or (select public.has_module_permission('Calendar', 'view'))
  )
);
create policy "members can view appointment notes"
on public.appointment_notes for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Appointments', 'view'))
);
create policy "members can view appointment status history"
on public.appointment_status_history for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Appointments', 'view'))
);

revoke all on table public.organization_business_hours from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.organization_booking_counters from anon, authenticated;
revoke all on table public.appointments from anon, authenticated;
revoke all on table public.appointment_notes from anon, authenticated;
revoke all on table public.appointment_status_history from anon, authenticated;
grant select on table public.organization_business_hours to authenticated;
grant select on table public.customers to authenticated;
grant select on table public.appointments to authenticated;
grant select on table public.appointment_notes to authenticated;
grant select on table public.appointment_status_history to authenticated;

revoke all on function private.current_active_membership() from public;
revoke all on function private.can_module(public.organization_members, text, text) from public;
revoke all on function private.normalized_phone(text) from public;
revoke all on function private.validate_appointment_slot(
  public.organization_members, uuid, uuid, text, uuid, text, timestamptz, timestamptz
) from public;
revoke all on function public.upsert_customer(
  uuid, text, text, text, text, public.customer_status, jsonb
) from public;
revoke all on function public.update_business_hours(jsonb) from public;
revoke all on function public.delete_customer(uuid) from public;
revoke all on function public.upsert_appointment(
  uuid, uuid, text, uuid, text, timestamptz, timestamptz,
  public.appointment_status, text, jsonb, text
) from public;
revoke all on function public.update_appointment_status(uuid, public.appointment_status) from public;
revoke all on function public.update_appointment_payment(uuid, numeric) from public;
revoke all on function public.add_appointment_note(uuid, text) from public;
revoke all on function public.delete_appointment(uuid) from public;

grant execute on function public.upsert_customer(
  uuid, text, text, text, text, public.customer_status, jsonb
) to authenticated;
grant execute on function public.update_business_hours(jsonb) to authenticated;
grant execute on function public.delete_customer(uuid) to authenticated;
grant execute on function public.upsert_appointment(
  uuid, uuid, text, uuid, text, timestamptz, timestamptz,
  public.appointment_status, text, jsonb, text
) to authenticated;
grant execute on function public.update_appointment_status(uuid, public.appointment_status) to authenticated;
grant execute on function public.update_appointment_payment(uuid, numeric) to authenticated;
grant execute on function public.add_appointment_note(uuid, text) to authenticated;
grant execute on function public.delete_appointment(uuid) to authenticated;

comment on table public.customers is
  'Tenant-scoped customer profiles. Custom field answers are capped JSONB; photos remain disabled in Phase 5.';
comment on table public.appointments is
  'Tenant-scoped appointment snapshots. Booking writes use transaction-level locks and database validation.';
