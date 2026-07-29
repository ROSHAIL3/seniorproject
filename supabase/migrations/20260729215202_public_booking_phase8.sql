alter table public.organizations
  add column booking_allow_same_day boolean not null default true,
  add column booking_auto_confirm boolean not null default false,
  add column booking_cancellation_notice_value integer not null default 24,
  add column booking_cancellation_notice_unit text not null default 'hours';

alter table public.organizations
  add constraint organizations_booking_cancellation_notice_value
    check (booking_cancellation_notice_value between 0 and 365),
  add constraint organizations_booking_cancellation_notice_unit
    check (booking_cancellation_notice_unit in ('minutes', 'hours', 'days'));

alter table public.appointments
  add column booking_source text not null default 'admin',
  add column public_submission_id uuid,
  add column public_reference_token uuid;

alter table public.appointments
  add constraint appointments_booking_source
    check (booking_source in ('admin', 'public')),
  add constraint appointments_public_metadata
    check (
      (
        booking_source = 'admin'
        and public_submission_id is null
        and public_reference_token is null
      )
      or (
        booking_source = 'public'
        and public_submission_id is not null
        and public_reference_token is not null
      )
    );

create unique index appointments_public_submission_unique
  on public.appointments (organization_id, public_submission_id)
  where public_submission_id is not null;

create unique index appointments_public_reference_unique
  on public.appointments (organization_id, public_reference_token)
  where public_reference_token is not null;

create table public.public_booking_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  normalized_phone text not null
    check (char_length(normalized_phone) between 3 and 40),
  attempted_at timestamptz not null default now()
);

create index public_booking_attempts_fingerprint_time
  on public.public_booking_attempts (
    organization_id, request_fingerprint, attempted_at desc
  );

create index public_booking_attempts_phone_time
  on public.public_booking_attempts (
    organization_id, normalized_phone, attempted_at desc
  );

create index public_booking_attempts_cleanup
  on public.public_booking_attempts (attempted_at);

alter table public.public_booking_attempts enable row level security;
revoke all on table public.public_booking_attempts from public, anon, authenticated;

create schema if not exists booking_private;
revoke all on schema booking_private from public;

create or replace function booking_private.public_booking_organization(
  booking_slug text
)
returns public.organizations
language sql
stable
security definer
set search_path = ''
as $$
  select organization
  from public.organizations organization
  where organization.slug = lower(btrim(booking_slug))
    and organization.status = 'active'
    and organization.public_booking_enabled
  limit 1;
$$;

create or replace function booking_private.get_public_booking_page(
  booking_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  organization public.organizations :=
    booking_private.public_booking_organization(booking_slug);
begin
  if organization.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'name', organization.name,
      'slug', organization.slug,
      'address', coalesce(organization.address, ''),
      'businessPhone', coalesce(organization.business_phone, ''),
      'website', coalesce(organization.website, ''),
      'currencyCode', organization.currency_code,
      'timeZone', organization.time_zone,
      'logoObjectPath', organization.logo_object_path,
      'allowSameDayBookings', organization.booking_allow_same_day,
      'autoConfirmAppointments', organization.booking_auto_confirm
    ),
    'branches', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', branch.id,
          'name', branch.name,
          'address', coalesce(branch.address, ''),
          'phone', coalesce(branch.phone, ''),
          'isMain', branch.is_main
        )
        order by branch.is_main desc, branch.name
      )
      from public.branches branch
      where branch.organization_id = organization.id
        and branch.status = 'active'
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', category.id, 'name', category.name)
        order by category.name
      )
      from public.service_categories category
      where category.organization_id = organization.id
        and category.status = 'active'
        and exists (
          select 1
          from public.services service
          where service.organization_id = category.organization_id
            and service.category_id = category.id
            and service.is_active
            and exists (
              select 1 from public.service_branches branch_assignment
              where branch_assignment.organization_id = service.organization_id
                and branch_assignment.service_id = service.id
            )
            and exists (
              select 1 from public.service_staff staff_assignment
              join public.organization_members membership
                on membership.organization_id = staff_assignment.organization_id
               and membership.id = staff_assignment.membership_id
               and membership.status = 'active'
              where staff_assignment.organization_id = service.organization_id
                and staff_assignment.service_id = service.id
            )
        )
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', service.id,
          'categoryId', service.category_id,
          'name', service.name,
          'description', service.description,
          'durationMinutes', service.duration_minutes,
          'priceBhd', service.price_bhd,
          'branchIds', coalesce((
            select jsonb_agg(assignment.branch_id order by assignment.branch_id)
            from public.service_branches assignment
            join public.branches branch
              on branch.organization_id = assignment.organization_id
             and branch.id = assignment.branch_id
             and branch.status = 'active'
            where assignment.organization_id = service.organization_id
              and assignment.service_id = service.id
          ), '[]'::jsonb)
        )
        order by service.name
      )
      from public.services service
      join public.service_categories category
        on category.organization_id = service.organization_id
       and category.id = service.category_id
       and category.status = 'active'
      where service.organization_id = organization.id
        and service.is_active
        and exists (
          select 1 from public.service_branches branch_assignment
          join public.branches branch
            on branch.organization_id = branch_assignment.organization_id
           and branch.id = branch_assignment.branch_id
           and branch.status = 'active'
          where branch_assignment.organization_id = service.organization_id
            and branch_assignment.service_id = service.id
        )
        and exists (
          select 1 from public.service_staff staff_assignment
          join public.organization_members membership
            on membership.organization_id = staff_assignment.organization_id
           and membership.id = staff_assignment.membership_id
           and membership.status = 'active'
          where staff_assignment.organization_id = service.organization_id
            and staff_assignment.service_id = service.id
        )
    ), '[]'::jsonb),
    'serviceFields', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', definition.id,
          'serviceId', definition.service_id,
          'label', definition.label,
          'type', definition.type,
          'required', definition.required,
          'sortOrder', definition.sort_order,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object('id', option.id, 'label', option.label)
              order by option.sort_order
            )
            from public.service_booking_field_options option
            where option.organization_id = definition.organization_id
              and option.field_id = definition.id
          ), '[]'::jsonb)
        )
        order by definition.service_id, definition.sort_order
      )
      from public.service_booking_field_definitions definition
      join public.services service
        on service.organization_id = definition.organization_id
       and service.id = definition.service_id
       and service.is_active
      where definition.organization_id = organization.id
        and definition.is_active
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function booking_private.get_public_booking_availability(
  booking_slug text,
  target_branch_id uuid,
  target_service_id text,
  target_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  organization public.organizations :=
    booking_private.public_booking_organization(booking_slug);
  selected_service public.services;
  business_day public.organization_business_hours;
  staff_record record;
  schedule_days jsonb;
  staff_day jsonb;
  local_today date;
  local_start_time time;
  local_end_time time;
  local_break_start time;
  local_break_end time;
  slot_local timestamp;
  slot_start timestamptz;
  slot_end timestamptz;
  result jsonb := '[]'::jsonb;
begin
  if organization.id is null then
    return jsonb_build_object('error', 'BOOKING_PAGE_NOT_FOUND');
  end if;

  local_today := (now() at time zone organization.time_zone)::date;
  if target_date < local_today
    or target_date > local_today + 90
    or (target_date = local_today and not organization.booking_allow_same_day) then
    return jsonb_build_object('error', 'BOOKING_DATE_INVALID');
  end if;

  if not exists (
    select 1 from public.branches branch
    where branch.organization_id = organization.id
      and branch.id = target_branch_id
      and branch.status = 'active'
  ) then
    return jsonb_build_object('error', 'BRANCH_INVALID');
  end if;

  select service.* into selected_service
  from public.services service
  join public.service_categories category
    on category.organization_id = service.organization_id
   and category.id = service.category_id
   and category.status = 'active'
  join public.service_branches assignment
    on assignment.organization_id = service.organization_id
   and assignment.service_id = service.id
   and assignment.branch_id = target_branch_id
  where service.organization_id = organization.id
    and service.id = target_service_id
    and service.is_active;

  if selected_service.id is null then
    return jsonb_build_object('error', 'SERVICE_INVALID');
  end if;

  select hours.* into business_day
  from public.organization_business_hours hours
  where hours.organization_id = organization.id
    and hours.day_of_week = extract(dow from target_date)::smallint;

  if business_day.organization_id is null or not business_day.is_open then
    return result;
  end if;

  for staff_record in
    select
      membership.id,
      membership.staff_key,
      coalesce(nullif(btrim(profile.full_name), ''), 'Staff member') as staff_name
    from public.service_staff assignment
    join public.organization_members membership
      on membership.organization_id = assignment.organization_id
     and membership.id = assignment.membership_id
     and membership.status = 'active'
     and membership.primary_branch_id = target_branch_id
    left join public.profiles profile on profile.user_id = membership.user_id
    where assignment.organization_id = organization.id
      and assignment.service_id = selected_service.id
    order by staff_name, membership.staff_key
  loop
    local_start_time := business_day.start_time;
    local_end_time := business_day.end_time;
    local_break_start := business_day.break_start_time;
    local_break_end := business_day.break_end_time;

    select schedule.days into schedule_days
    from public.staff_schedules schedule
    where schedule.organization_id = organization.id
      and schedule.membership_id = staff_record.id
      and schedule.use_custom_hours;

    if schedule_days is not null then
      select day_value into staff_day
      from jsonb_array_elements(schedule_days) day_value
      where (day_value ->> 'dayOfWeek')::integer =
        extract(dow from target_date)::integer
      limit 1;

      if staff_day is null
        or not coalesce((staff_day ->> 'isOpen')::boolean, false) then
        continue;
      end if;

      local_start_time := (staff_day ->> 'startTime')::time;
      local_end_time := (staff_day ->> 'endTime')::time;
      local_break_start :=
        nullif(staff_day ->> 'breakStartTime', '')::time;
      local_break_end :=
        nullif(staff_day ->> 'breakEndTime', '')::time;
    end if;

    if exists (
      select 1 from public.staff_time_off leave
      where leave.organization_id = organization.id
        and leave.membership_id = staff_record.id
        and target_date between leave.start_date and leave.end_date
    ) then
      continue;
    end if;

    for slot_local in
      select generated_slot
      from generate_series(
        target_date + local_start_time,
        target_date + local_end_time
          - make_interval(mins => selected_service.duration_minutes),
        interval '15 minutes'
      ) generated_slot
    loop
      slot_start := slot_local at time zone organization.time_zone;
      slot_end := slot_start
        + make_interval(mins => selected_service.duration_minutes);

      if slot_start <= now()
        or (
          business_day.break_start_time is not null
          and slot_local::time < business_day.break_end_time
          and (slot_local + make_interval(
            mins => selected_service.duration_minutes
          ))::time > business_day.break_start_time
        )
        or (
          local_break_start is not null
          and slot_local::time < local_break_end
          and (slot_local + make_interval(
            mins => selected_service.duration_minutes
          ))::time > local_break_start
        )
        or exists (
          select 1 from public.appointments appointment
          where appointment.organization_id = organization.id
            and appointment.membership_id = staff_record.id
            and appointment.status <> 'cancelled'
            and appointment.starts_at < slot_end
            and appointment.ends_at > slot_start
        )
      then
        continue;
      end if;

      result := result || jsonb_build_array(jsonb_build_object(
        'staffKey', staff_record.staff_key,
        'staffName', staff_record.staff_name,
        'startAt', slot_start,
        'endAt', slot_end
      ));
    end loop;
  end loop;

  return result;
end;
$$;

create or replace function booking_private.create_public_booking(
  booking_slug text,
  target_branch_id uuid,
  target_service_id text,
  target_staff_key text,
  target_start_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_notes text,
  target_service_field_values jsonb,
  submission_id uuid,
  request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization public.organizations :=
    booking_private.public_booking_organization(booking_slug);
  normalized_customer_phone text :=
    private.normalized_phone(customer_phone);
  availability jsonb;
  selected_slot jsonb;
  selected_service public.services;
  selected_staff public.organization_members;
  selected_customer public.customers;
  created_appointment public.appointments;
  next_booking_number bigint;
  reference_token uuid := gen_random_uuid();
  target_status public.appointment_status;
  lock_one bigint;
  lock_two bigint;
begin
  if organization.id is null then
    return jsonb_build_object('ok', false, 'error', 'BOOKING_PAGE_NOT_FOUND');
  end if;

  if submission_id is null
    or request_fingerprint !~ '^[a-f0-9]{64}$'
    or char_length(btrim(customer_name)) not between 1 and 160
    or char_length(normalized_customer_phone) not between 3 and 40
    or char_length(coalesce(customer_email, '')) > 320
    or (
      nullif(btrim(coalesce(customer_email, '')), '') is not null
      and btrim(customer_email) !~*
        '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
    or char_length(coalesce(customer_notes, '')) > 2000
    or jsonb_typeof(coalesce(target_service_field_values, '{}'::jsonb))
      <> 'object'
    or pg_column_size(coalesce(target_service_field_values, '{}'::jsonb))
      > 32768
  then
    return jsonb_build_object('ok', false, 'error', 'BOOKING_INPUT_INVALID');
  end if;

  select appointment.* into created_appointment
  from public.appointments appointment
  where appointment.organization_id = organization.id
    and appointment.public_submission_id = submission_id;

  if created_appointment.id is not null then
    return jsonb_build_object(
      'ok', true,
      'bookingNumber', created_appointment.booking_number,
      'referenceToken', created_appointment.public_reference_token,
      'status', created_appointment.status
    );
  end if;

  delete from public.public_booking_attempts attempt
  where attempt.attempted_at < now() - interval '24 hours';

  if (
    select count(*) >= 10
    from public.public_booking_attempts attempt
    where attempt.organization_id = organization.id
      and attempt.request_fingerprint = request_fingerprint
      and attempt.attempted_at >= now() - interval '15 minutes'
  ) or (
    select count(*) >= 5
    from public.public_booking_attempts attempt
    where attempt.organization_id = organization.id
      and attempt.normalized_phone = normalized_customer_phone
      and attempt.attempted_at >= now() - interval '1 hour'
  ) then
    return jsonb_build_object('ok', false, 'error', 'BOOKING_RATE_LIMITED');
  end if;

  insert into public.public_booking_attempts (
    organization_id, request_fingerprint, normalized_phone
  )
  values (
    organization.id, request_fingerprint, normalized_customer_phone
  );

  lock_one := hashtextextended(
    organization.id::text || ':public-phone:' || normalized_customer_phone, 0
  );
  lock_two := hashtextextended(
    organization.id::text || ':staff:' || target_staff_key, 0
  );
  perform pg_advisory_xact_lock(least(lock_one, lock_two));
  perform pg_advisory_xact_lock(greatest(lock_one, lock_two));

  begin
    availability := booking_private.get_public_booking_availability(
      booking_slug,
      target_branch_id,
      target_service_id,
      (target_start_at at time zone organization.time_zone)::date
    );

    select slot into selected_slot
    from jsonb_array_elements(availability) slot
    where slot ->> 'staffKey' = target_staff_key
      and (slot ->> 'startAt')::timestamptz = target_start_at
    limit 1;

    if selected_slot is null then
      return jsonb_build_object('ok', false, 'error', 'BOOKING_SLOT_UNAVAILABLE');
    end if;

    select service.* into selected_service
    from public.services service
    where service.organization_id = organization.id
      and service.id = target_service_id
      and service.is_active;

    select membership.* into selected_staff
    from public.organization_members membership
    where membership.organization_id = organization.id
      and membership.staff_key = target_staff_key
      and membership.status = 'active';

    select customer.* into selected_customer
    from public.customers customer
    where customer.organization_id = organization.id
      and customer.normalized_phone = normalized_customer_phone;

    if selected_customer.id is null then
      insert into public.customers (
        organization_id, name, phone, normalized_phone, email, notes, status
      )
      values (
        organization.id,
        btrim(customer_name),
        btrim(customer_phone),
        normalized_customer_phone,
        lower(btrim(coalesce(customer_email, ''))),
        btrim(coalesce(customer_notes, '')),
        'active'
      )
      returning * into selected_customer;
    else
      update public.customers set
        name = btrim(customer_name),
        phone = btrim(customer_phone),
        email = case
          when nullif(btrim(coalesce(customer_email, '')), '') is null
            then public.customers.email
          else lower(btrim(customer_email))
        end,
        status = 'active'
      where id = selected_customer.id
      returning * into selected_customer;
    end if;

    insert into public.organization_booking_counters (
      organization_id, next_number
    )
    values (organization.id, 2)
    on conflict (organization_id) do update
      set next_number = public.organization_booking_counters.next_number + 1
    returning next_number - 1 into next_booking_number;

    target_status := case
      when organization.booking_auto_confirm then 'confirmed'
      else 'booked'
    end;

    insert into public.appointments (
      organization_id,
      booking_number,
      customer_id,
      membership_id,
      branch_id,
      offering_type,
      service_id,
      starts_at,
      ends_at,
      customer_name,
      customer_phone,
      customer_email,
      staff_name,
      offering_name,
      price_bhd,
      status,
      notes,
      service_field_values,
      created_by_name,
      booking_source,
      public_submission_id,
      public_reference_token
    )
    values (
      organization.id,
      'BK-' || lpad(next_booking_number::text, 6, '0'),
      selected_customer.id,
      selected_staff.id,
      target_branch_id,
      'service',
      selected_service.id,
      target_start_at,
      (selected_slot ->> 'endAt')::timestamptz,
      selected_customer.name,
      selected_customer.phone,
      selected_customer.email,
      selected_slot ->> 'staffName',
      selected_service.name,
      selected_service.price_bhd,
      target_status,
      btrim(coalesce(customer_notes, '')),
      coalesce(target_service_field_values, '{}'::jsonb),
      'Public booking',
      'public',
      submission_id,
      reference_token
    )
    returning * into created_appointment;

    return jsonb_build_object(
      'ok', true,
      'bookingNumber', created_appointment.booking_number,
      'referenceToken', reference_token,
      'status', created_appointment.status
    );
  exception
    when unique_violation then
      return jsonb_build_object(
        'ok', false, 'error', 'BOOKING_CUSTOMER_CONFLICT'
      );
    when others then
      if sqlerrm like '%SERVICE_FIELD_%' then
        return jsonb_build_object(
          'ok', false, 'error', split_part(sqlerrm, ':', 1)
        );
      end if;
      return jsonb_build_object('ok', false, 'error', 'BOOKING_FAILED');
  end;
end;
$$;

create or replace function booking_private.get_public_booking_confirmation(
  booking_slug text,
  reference_token uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bookingNumber', appointment.booking_number,
    'organizationName', organization.name,
    'serviceName', appointment.offering_name,
    'staffName', appointment.staff_name,
    'branchName', branch.name,
    'startsAt', appointment.starts_at,
    'endsAt', appointment.ends_at,
    'status', appointment.status,
    'timeZone', organization.time_zone
  )
  from public.appointments appointment
  join public.organizations organization
    on organization.id = appointment.organization_id
   and organization.slug = lower(btrim(booking_slug))
   and organization.status = 'active'
   and organization.public_booking_enabled
  join public.branches branch
    on branch.organization_id = appointment.organization_id
   and branch.id = appointment.branch_id
  where appointment.booking_source = 'public'
    and appointment.public_reference_token = reference_token
  limit 1;
$$;

create or replace function public.get_public_booking_page(
  booking_slug text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select booking_private.get_public_booking_page(booking_slug);
$$;

create or replace function public.get_public_booking_availability(
  booking_slug text,
  target_branch_id uuid,
  target_service_id text,
  target_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select booking_private.get_public_booking_availability(
    booking_slug, target_branch_id, target_service_id, target_date
  );
$$;

create or replace function public.create_public_booking(
  booking_slug text,
  target_branch_id uuid,
  target_service_id text,
  target_staff_key text,
  target_start_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_notes text,
  target_service_field_values jsonb,
  submission_id uuid,
  request_fingerprint text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select booking_private.create_public_booking(
    booking_slug,
    target_branch_id,
    target_service_id,
    target_staff_key,
    target_start_at,
    customer_name,
    customer_phone,
    customer_email,
    customer_notes,
    target_service_field_values,
    submission_id,
    request_fingerprint
  );
$$;

create or replace function public.get_public_booking_confirmation(
  booking_slug text,
  reference_token uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select booking_private.get_public_booking_confirmation(
    booking_slug, reference_token
  );
$$;

create or replace function public.update_general_appointment_settings(
  target_allow_same_day boolean,
  target_auto_confirm boolean,
  target_cancellation_notice_value integer,
  target_cancellation_notice_unit text
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.organizations;
begin
  if actor.id is null or not private.can_module(actor, 'Settings', 'edit') then
    raise exception 'SETTINGS_FORBIDDEN';
  end if;

  if target_cancellation_notice_value not between 0 and 365
    or lower(target_cancellation_notice_unit)
      not in ('minutes', 'hours', 'days') then
    raise exception 'SETTINGS_INVALID';
  end if;

  update public.organizations set
    booking_allow_same_day = target_allow_same_day,
    booking_auto_confirm = target_auto_confirm,
    booking_cancellation_notice_value =
      target_cancellation_notice_value,
    booking_cancellation_notice_unit =
      lower(target_cancellation_notice_unit)
  where id = actor.organization_id
  returning * into result;

  return result;
end;
$$;

revoke all on function booking_private.public_booking_organization(text)
  from public, anon, authenticated, service_role;
revoke all on function booking_private.get_public_booking_page(text)
  from public, anon, authenticated, service_role;
revoke all on function booking_private.get_public_booking_availability(
  text, uuid, text, date
) from public, anon, authenticated, service_role;
revoke all on function booking_private.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text, jsonb,
  uuid, text
) from public, anon, authenticated, service_role;
revoke all on function booking_private.get_public_booking_confirmation(text, uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.get_public_booking_page(text) from public;
revoke all on function public.get_public_booking_availability(
  text, uuid, text, date
) from public;
revoke all on function public.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text, jsonb,
  uuid, text
) from public;
revoke all on function public.get_public_booking_confirmation(text, uuid)
  from public;
revoke all on function public.update_general_appointment_settings(
  boolean, boolean, integer, text
) from public;

grant usage on schema booking_private to anon, authenticated, service_role;
grant execute on function booking_private.get_public_booking_page(text)
  to anon, authenticated, service_role;
grant execute on function booking_private.get_public_booking_availability(
  text, uuid, text, date
) to anon, authenticated, service_role;
grant execute on function booking_private.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text, jsonb,
  uuid, text
) to service_role;
grant execute on function booking_private.get_public_booking_confirmation(text, uuid)
  to anon, authenticated, service_role;

grant execute on function public.get_public_booking_page(text)
  to anon, authenticated, service_role;
grant execute on function public.get_public_booking_availability(
  text, uuid, text, date
) to anon, authenticated, service_role;
grant execute on function public.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text, jsonb,
  uuid, text
) to service_role;
grant execute on function public.get_public_booking_confirmation(text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.update_general_appointment_settings(
  boolean, boolean, integer, text
) to authenticated;

comment on table public.public_booking_attempts is
  'Short-lived public booking abuse-control counters. Rows older than 24 hours are deleted opportunistically.';
comment on function public.get_public_booking_page(text) is
  'Anonymous, read-only public booking catalog scoped to one enabled organization slug.';
comment on function public.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text, jsonb,
  uuid, text
) is
  'Server-only public booking transaction. The browser cannot execute it directly.';
