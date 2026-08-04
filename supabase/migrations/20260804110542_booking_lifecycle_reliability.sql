-- Repair the complete public-booking lifecycle without exposing direct table
-- writes. Public RPCs continue to return reduced JSON records only.

alter table public.appointment_reschedule_requests
  add column proposed_branch_id uuid;

update public.appointment_reschedule_requests request
set proposed_branch_id = appointment.branch_id
from public.appointments appointment
where appointment.organization_id = request.organization_id
  and appointment.id = request.appointment_id;

alter table public.appointment_reschedule_requests
  alter column proposed_branch_id set not null,
  add constraint appointment_reschedule_requests_proposed_branch_fk
    foreign key (organization_id, proposed_branch_id)
    references public.branches (organization_id, id) on delete restrict;

create index appointment_reschedule_requests_proposed_branch_idx
  on public.appointment_reschedule_requests (organization_id, proposed_branch_id);

create or replace function booking_private.public_booking_offering(
  target_organization_id uuid,
  target_branch_id uuid,
  target_offering_id text
)
returns table (
  offering_type public.appointment_offering_type,
  service_id text,
  package_id text,
  package_type public.package_type,
  duration_minutes integer,
  price_bhd numeric,
  offering_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    'service'::public.appointment_offering_type,
    service.id,
    null::text,
    null::public.package_type,
    service.duration_minutes,
    service.price_bhd,
    service.name
  from public.services service
  join public.service_categories category
    on category.organization_id = service.organization_id
   and category.id = service.category_id
   and category.status = 'active'
  join public.service_branches branch_assignment
    on branch_assignment.organization_id = service.organization_id
   and branch_assignment.service_id = service.id
   and branch_assignment.branch_id = target_branch_id
  where service.organization_id = target_organization_id
    and service.id = target_offering_id
    and service.is_active

  union all

  select
    'package'::public.appointment_offering_type,
    null::text,
    package.id,
    package.type,
    sum(service.duration_minutes * item.quantity)::integer,
    package.selling_price_bhd,
    package.name
  from public.service_packages package
  join public.package_items item
    on item.organization_id = package.organization_id
   and item.package_id = package.id
  join public.services service
    on service.organization_id = item.organization_id
   and service.id = item.service_id
   and service.is_active
  join public.service_categories category
    on category.organization_id = service.organization_id
   and category.id = service.category_id
   and category.status = 'active'
  where package.organization_id = target_organization_id
    and package.id = target_offering_id
    and package.is_active
    and not exists (
      select 1
      from public.package_items required_item
      where required_item.organization_id = package.organization_id
        and required_item.package_id = package.id
        and not exists (
          select 1
          from public.services required_service
          join public.service_categories required_category
            on required_category.organization_id = required_service.organization_id
           and required_category.id = required_service.category_id
           and required_category.status = 'active'
          join public.service_branches required_branch
            on required_branch.organization_id = required_service.organization_id
           and required_branch.service_id = required_service.id
           and required_branch.branch_id = target_branch_id
          where required_service.organization_id = required_item.organization_id
            and required_service.id = required_item.service_id
            and required_service.is_active
        )
    )
  group by package.id, package.type, package.selling_price_bhd, package.name;
$$;

revoke all on function booking_private.public_booking_offering(uuid, uuid, text)
  from public;
grant execute on function booking_private.public_booking_offering(uuid, uuid, text)
  to anon, authenticated, service_role;

create or replace function booking_private.get_public_booking_page_v3(
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
  page_data jsonb := booking_private.get_public_booking_page_v2(booking_slug);
begin
  if organization.id is null or page_data is null then
    return null;
  end if;

  return page_data || jsonb_build_object(
    'packages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', package.id,
          'categoryId', 'packages',
          'kind', 'package',
          'name', package.name,
          'description', package.description,
          'durationMinutes', package_duration.duration_minutes,
          'priceBhd', package.selling_price_bhd,
          'branchIds', coalesce((
            select jsonb_agg(branch.id order by branch.is_main desc, branch.name)
            from public.branches branch
            where branch.organization_id = package.organization_id
              and branch.status = 'active'
              and not exists (
                select 1
                from public.package_items required_item
                where required_item.organization_id = package.organization_id
                  and required_item.package_id = package.id
                  and not exists (
                    select 1
                    from public.service_branches assignment
                    join public.services required_service
                      on required_service.organization_id = assignment.organization_id
                     and required_service.id = assignment.service_id
                     and required_service.is_active
                    join public.service_categories required_category
                      on required_category.organization_id = required_service.organization_id
                     and required_category.id = required_service.category_id
                     and required_category.status = 'active'
                    where assignment.organization_id = required_item.organization_id
                      and assignment.service_id = required_item.service_id
                      and assignment.branch_id = branch.id
                  )
              )
          ), '[]'::jsonb)
        ) order by package.name
      )
      from public.service_packages package
      cross join lateral (
        select sum(service.duration_minutes * item.quantity)::integer
          as duration_minutes
        from public.package_items item
        join public.services service
          on service.organization_id = item.organization_id
         and service.id = item.service_id
         and service.is_active
        join public.service_categories category
          on category.organization_id = service.organization_id
         and category.id = service.category_id
         and category.status = 'active'
        where item.organization_id = package.organization_id
          and item.package_id = package.id
      ) package_duration
      where package.organization_id = organization.id
        and package.is_active
        and package_duration.duration_minutes > 0
        and not exists (
          select 1 from public.package_items item
          where item.organization_id = package.organization_id
            and item.package_id = package.id
            and not exists (
              select 1 from public.services service
              join public.service_categories category
                on category.organization_id = service.organization_id
               and category.id = service.category_id
               and category.status = 'active'
              where service.organization_id = item.organization_id
                and service.id = item.service_id
                and service.is_active
            )
        )
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_public_booking_page(booking_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select booking_private.get_public_booking_page_v3(booking_slug);
$$;

revoke all on function booking_private.get_public_booking_page_v3(text)
  from public;
grant execute on function booking_private.get_public_booking_page_v3(text)
  to anon, authenticated, service_role;

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
  offering record;
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

  select * into offering
  from booking_private.public_booking_offering(
    organization.id, target_branch_id, target_service_id
  ) limit 1;
  if offering.offering_type is null then
    return jsonb_build_object('error', 'OFFERING_INVALID');
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
    from public.organization_members membership
    left join public.profiles profile on profile.user_id = membership.user_id
    where membership.organization_id = organization.id
      and membership.status = 'active'
      and membership.primary_branch_id = target_branch_id
      and (
        (
          offering.offering_type = 'service'
          and exists (
            select 1 from public.service_staff assignment
            where assignment.organization_id = organization.id
              and assignment.service_id = offering.service_id
              and assignment.membership_id = membership.id
          )
        )
        or (
          offering.offering_type = 'package'
          and not exists (
            select 1 from public.package_items item
            where item.organization_id = organization.id
              and item.package_id = offering.package_id
              and not exists (
                select 1 from public.service_staff assignment
                where assignment.organization_id = item.organization_id
                  and assignment.service_id = item.service_id
                  and assignment.membership_id = membership.id
              )
          )
        )
      )
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
      local_break_start := nullif(staff_day ->> 'breakStartTime', '')::time;
      local_break_end := nullif(staff_day ->> 'breakEndTime', '')::time;
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
          - make_interval(mins => offering.duration_minutes),
        interval '15 minutes'
      ) generated_slot
    loop
      slot_start := slot_local at time zone organization.time_zone;
      slot_end := slot_start + make_interval(mins => offering.duration_minutes);
      if slot_start <= now()
        or (
          business_day.break_start_time is not null
          and slot_local::time < business_day.break_end_time
          and (slot_local + make_interval(mins => offering.duration_minutes))::time
            > business_day.break_start_time
        )
        or (
          local_break_start is not null
          and slot_local::time < local_break_end
          and (slot_local + make_interval(mins => offering.duration_minutes))::time
            > local_break_start
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

create or replace function booking_private.force_public_booking_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auto_confirm boolean := false;
begin
  if new.booking_source = 'public' then
    select organization.booking_auto_confirm into auto_confirm
    from public.organizations organization
    where organization.id = new.organization_id;
    if coalesce(auto_confirm, false) then
      new.status := 'confirmed';
      new.request_status := 'approved';
      new.request_decided_at := now();
    else
      new.status := 'booked';
      new.request_status := 'pending';
      new.request_decided_at := null;
    end if;
    new.request_decided_by := null;
    new.request_rejection_reason := null;
  end if;
  return new;
end;
$$;

comment on function booking_private.force_public_booking_request() is
  'Initializes a public booking as pending or approved from the tenant auto-confirm setting.';

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
  target_customer_field_values jsonb,
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
  normalized_customer_phone text := private.normalized_phone(customer_phone);
  availability jsonb;
  selected_slot jsonb;
  offering record;
  selected_staff public.organization_members;
  selected_customer public.customers;
  created_appointment public.appointments;
  next_booking_number bigint;
  reference_token uuid := gen_random_uuid();
  lock_one bigint;
  lock_two bigint;
  conflict_constraint text;
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
      and btrim(customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
    or char_length(coalesce(customer_notes, '')) > 2000
    or jsonb_typeof(coalesce(target_customer_field_values, '{}'::jsonb)) <> 'object'
    or pg_column_size(coalesce(target_customer_field_values, '{}'::jsonb)) > 32768
    or jsonb_typeof(coalesce(target_service_field_values, '{}'::jsonb)) <> 'object'
    or pg_column_size(coalesce(target_service_field_values, '{}'::jsonb)) > 32768
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
    select count(*) >= 10 from public.public_booking_attempts attempt
    where attempt.organization_id = organization.id
      and attempt.request_fingerprint = $13
      and attempt.attempted_at >= now() - interval '15 minutes'
  ) or (
    select count(*) >= 5 from public.public_booking_attempts attempt
    where attempt.organization_id = organization.id
      and attempt.normalized_phone = normalized_customer_phone
      and attempt.attempted_at >= now() - interval '1 hour'
  ) then
    return jsonb_build_object('ok', false, 'error', 'BOOKING_RATE_LIMITED');
  end if;
  insert into public.public_booking_attempts (
    organization_id, request_fingerprint, normalized_phone
  ) values (organization.id, $13, normalized_customer_phone);

  select customer.* into selected_customer
  from public.customers customer
  where customer.organization_id = organization.id
    and customer.normalized_phone = normalized_customer_phone;
  lock_one := hashtextextended(
    organization.id::text || case
      when selected_customer.id is null then ':public-phone:' || normalized_customer_phone
      else ':customer:' || selected_customer.id::text
    end, 0
  );
  lock_two := hashtextextended(
    organization.id::text || ':staff:' || target_staff_key, 0
  );
  perform pg_advisory_xact_lock(least(lock_one, lock_two));
  perform pg_advisory_xact_lock(greatest(lock_one, lock_two));

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

  begin
    availability := booking_private.get_public_booking_availability(
      booking_slug, target_branch_id, target_service_id,
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

    select * into offering
    from booking_private.public_booking_offering(
      organization.id, target_branch_id, target_service_id
    ) limit 1;
    if offering.offering_type is null then
      return jsonb_build_object('ok', false, 'error', 'OFFERING_INVALID');
    end if;
    if offering.offering_type = 'package'
      and coalesce(target_service_field_values, '{}'::jsonb) <> '{}'::jsonb then
      return jsonb_build_object('ok', false, 'error', 'BOOKING_INPUT_INVALID');
    end if;

    select membership.* into selected_staff
    from public.organization_members membership
    where membership.organization_id = organization.id
      and membership.staff_key = target_staff_key
      and membership.status = 'active';

    select customer.* into selected_customer
    from public.customers customer
    where customer.organization_id = organization.id
      and customer.normalized_phone = normalized_customer_phone;
    if selected_customer.id is not null and exists (
      select 1 from public.appointments appointment
      where appointment.organization_id = organization.id
        and appointment.customer_id = selected_customer.id
        and appointment.status <> 'cancelled'
        and appointment.starts_at < (selected_slot ->> 'endAt')::timestamptz
        and appointment.ends_at > target_start_at
    ) then
      return jsonb_build_object('ok', false, 'error', 'BOOKING_CUSTOMER_CONFLICT');
    end if;

    if selected_customer.id is null then
      insert into public.customers (
        organization_id, name, phone, normalized_phone, email, notes,
        custom_values, status
      ) values (
        organization.id, btrim(customer_name), btrim(customer_phone),
        normalized_customer_phone, lower(btrim(coalesce(customer_email, ''))),
        btrim(coalesce(customer_notes, '')),
        coalesce(target_customer_field_values, '{}'::jsonb), 'active'
      ) returning * into selected_customer;
    else
      update public.customers set
        name = btrim(customer_name),
        phone = btrim(customer_phone),
        email = case
          when nullif(btrim(coalesce(customer_email, '')), '') is null
            then public.customers.email
          else lower(btrim(customer_email))
        end,
        custom_values = public.customers.custom_values
          || coalesce(target_customer_field_values, '{}'::jsonb),
        status = 'active'
      where id = selected_customer.id
      returning * into selected_customer;
    end if;

    insert into public.organization_booking_counters (organization_id, next_number)
    values (organization.id, 2)
    on conflict (organization_id) do update
      set next_number = public.organization_booking_counters.next_number + 1
    returning next_number - 1 into next_booking_number;

    insert into public.appointments (
      organization_id, booking_number, customer_id, membership_id, branch_id,
      offering_type, service_id, package_id, package_type,
      starts_at, ends_at, customer_name, customer_phone, customer_email,
      staff_name, offering_name, price_bhd, status, notes,
      service_field_values, created_by_name, booking_source,
      public_submission_id, public_reference_token
    ) values (
      organization.id, 'BK-' || lpad(next_booking_number::text, 6, '0'),
      selected_customer.id, selected_staff.id, target_branch_id,
      offering.offering_type, offering.service_id, offering.package_id,
      offering.package_type, target_start_at,
      (selected_slot ->> 'endAt')::timestamptz,
      selected_customer.name, selected_customer.phone, selected_customer.email,
      selected_slot ->> 'staffName', offering.offering_name, offering.price_bhd,
      case when organization.booking_auto_confirm then 'confirmed' else 'booked' end,
      btrim(coalesce(customer_notes, '')),
      coalesce(target_service_field_values, '{}'::jsonb),
      'Public booking', 'public', submission_id, reference_token
    ) returning * into created_appointment;

    return jsonb_build_object(
      'ok', true,
      'bookingNumber', created_appointment.booking_number,
      'referenceToken', reference_token,
      'status', created_appointment.status
    );
  exception
    when exclusion_violation then
      get stacked diagnostics conflict_constraint = constraint_name;
      return jsonb_build_object('ok', false, 'error', case
        when conflict_constraint = 'appointments_no_customer_overlap'
          then 'BOOKING_CUSTOMER_CONFLICT'
        else 'BOOKING_SLOT_UNAVAILABLE'
      end);
    when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'BOOKING_CUSTOMER_CONFLICT');
    when others then
      if sqlerrm like '%SERVICE_FIELD_%' or sqlerrm like '%CUSTOMER_FIELD_%' then
        return jsonb_build_object('ok', false, 'error', split_part(sqlerrm, ':', 1));
      end if;
      return jsonb_build_object('ok', false, 'error', 'BOOKING_FAILED');
  end;
end;
$$;

create or replace function booking_private.request_customer_reschedule(
  target_organization_id uuid,
  target_customer_id uuid,
  target_appointment_id uuid,
  target_branch_id uuid,
  target_staff_key text,
  target_start_at timestamptz,
  target_submission_id uuid,
  request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization public.organizations;
  appointment public.appointments;
  availability jsonb;
  selected_slot jsonb;
  selected_staff public.organization_members;
  result public.appointment_reschedule_requests;
  offering_id text;
begin
  select * into organization from public.organizations
  where id = target_organization_id and status = 'active'
    and public_booking_enabled;
  select * into appointment from public.appointments
  where organization_id = target_organization_id
    and customer_id = target_customer_id
    and id = target_appointment_id
  for update;
  offering_id := coalesce(appointment.service_id, appointment.package_id);

  if organization.id is null or appointment.id is null
    or offering_id is null or target_submission_id is null then
    return jsonb_build_object('ok', false, 'error', 'ACTION_NOT_ALLOWED');
  end if;
  if not booking_private.register_self_service_attempt(
    organization.id, 'reschedule', request_fingerprint,
    private.normalized_phone(appointment.customer_phone)
  ) then
    return jsonb_build_object('ok', false, 'error', 'ACTION_RATE_LIMITED');
  end if;
  if not booking_private.customer_booking_allowed(
    appointment.status, appointment.starts_at,
    organization.booking_cancellation_notice_value,
    organization.booking_cancellation_notice_unit
  ) then
    return jsonb_build_object('ok', false, 'error', 'ACTION_NOT_ALLOWED');
  end if;

  select existing.* into result
  from public.appointment_reschedule_requests existing
  where existing.organization_id = organization.id
    and existing.submission_id = target_submission_id;
  if result.id is not null then
    return jsonb_build_object('ok', true, 'requestId', result.id);
  end if;

  availability := booking_private.get_public_booking_availability(
    organization.slug, target_branch_id, offering_id,
    (target_start_at at time zone organization.time_zone)::date
  );
  select slot into selected_slot
  from jsonb_array_elements(availability) slot
  where slot ->> 'staffKey' = target_staff_key
    and (slot ->> 'startAt')::timestamptz = target_start_at
  limit 1;
  if selected_slot is null then
    return jsonb_build_object('ok', false, 'error', 'SLOT_UNAVAILABLE');
  end if;

  select * into selected_staff from public.organization_members
  where organization_id = organization.id
    and staff_key = target_staff_key and status = 'active';

  update public.appointment_reschedule_requests set
    status = 'withdrawn', resolved_at = now(), rejection_reason = null
  where organization_id = organization.id
    and appointment_id = appointment.id
    and status = 'pending';

  insert into public.appointment_reschedule_requests (
    organization_id, appointment_id, proposed_branch_id,
    proposed_membership_id, proposed_starts_at, proposed_ends_at, submission_id
  ) values (
    organization.id, appointment.id, target_branch_id, selected_staff.id,
    target_start_at, (selected_slot ->> 'endAt')::timestamptz,
    target_submission_id
  ) returning * into result;
  perform booking_private.record_customer_activity(
    organization.id, 'Reschedule requested by customer',
    'appointment_reschedule_request', result.id::text,
    'Customer requested a new time for appointment ' || appointment.booking_number
  );
  return jsonb_build_object('ok', true, 'requestId', result.id);
end;
$$;

create or replace function public.request_customer_reschedule(
  target_organization_id uuid,
  target_customer_id uuid,
  target_appointment_id uuid,
  target_branch_id uuid,
  target_staff_key text,
  target_start_at timestamptz,
  target_submission_id uuid,
  request_fingerprint text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select booking_private.request_customer_reschedule(
    target_organization_id, target_customer_id, target_appointment_id,
    target_branch_id, target_staff_key, target_start_at,
    target_submission_id, request_fingerprint
  );
$$;

revoke all on function booking_private.request_customer_reschedule(
  uuid, uuid, uuid, uuid, text, timestamptz, uuid, text
) from public;
revoke all on function public.request_customer_reschedule(
  uuid, uuid, uuid, uuid, text, timestamptz, uuid, text
) from public;
grant execute on function booking_private.request_customer_reschedule(
  uuid, uuid, uuid, uuid, text, timestamptz, uuid, text
) to service_role;
grant execute on function public.request_customer_reschedule(
  uuid, uuid, uuid, uuid, text, timestamptz, uuid, text
) to service_role;

create or replace function booking_private.decide_reschedule_request(
  target_request_id uuid,
  decision text,
  decision_reason text
)
returns public.appointment_reschedule_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := booking_private.appointment_actor();
  request public.appointment_reschedule_requests;
  appointment public.appointments;
  staff public.organization_members;
  staff_name_value text;
begin
  select * into request from public.appointment_reschedule_requests
  where organization_id = actor.organization_id
    and id = target_request_id and status = 'pending'
  for update;
  if request.id is null or decision not in ('approve', 'reject') then
    raise exception 'RESCHEDULE_DECISION_INVALID';
  end if;
  if decision = 'reject'
    and char_length(btrim(coalesce(decision_reason, ''))) not between 3 and 500 then
    raise exception 'DECISION_REASON_REQUIRED';
  end if;

  select * into appointment from public.appointments
  where organization_id = actor.organization_id
    and id = request.appointment_id for update;
  if appointment.status not in ('booked', 'confirmed')
    or appointment.starts_at <= now() then
    raise exception 'RESCHEDULE_DECISION_INVALID';
  end if;

  if decision = 'approve' then
    select * into staff from public.organization_members
    where organization_id = actor.organization_id
      and id = request.proposed_membership_id
    for update;
    perform 1 from private.validate_appointment_slot(
      actor, appointment.id, appointment.customer_id, staff.staff_key,
      request.proposed_branch_id,
      coalesce(appointment.service_id, appointment.package_id),
      request.proposed_starts_at, request.proposed_ends_at
    );
    select coalesce(nullif(btrim(profile.full_name), ''), appointment.staff_name)
      into staff_name_value
    from public.profiles profile where profile.user_id = staff.user_id;
    update public.appointments set
      membership_id = staff.id,
      branch_id = request.proposed_branch_id,
      staff_name = coalesce(staff_name_value, appointment.staff_name),
      starts_at = request.proposed_starts_at,
      ends_at = request.proposed_ends_at,
      status = 'confirmed'
    where id = appointment.id;
    if appointment.status <> 'confirmed' then
      insert into public.appointment_status_history (
        organization_id, appointment_id, old_status, new_status,
        changed_by, reason, source
      ) values (
        actor.organization_id, appointment.id, appointment.status, 'confirmed',
        (select auth.uid()), 'Reschedule approved', 'staff'
      );
    end if;
    update public.appointment_reschedule_requests set
      status = 'approved', resolved_at = now(),
      resolved_by = (select auth.uid()), rejection_reason = null
    where id = request.id returning * into request;
  else
    update public.appointment_reschedule_requests set
      status = 'rejected', resolved_at = now(),
      resolved_by = (select auth.uid()),
      rejection_reason = btrim(decision_reason)
    where id = request.id returning * into request;
  end if;
  return request;
end;
$$;

create or replace function booking_private.decide_public_booking(
  target_appointment_id uuid,
  decision text,
  decision_reason text
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := booking_private.appointment_actor();
  appointment public.appointments;
  next_status public.appointment_status;
  normalized_reason text := nullif(btrim(coalesce(decision_reason, '')), '');
begin
  select * into appointment from public.appointments
  where organization_id = actor.organization_id
    and id = target_appointment_id
    and booking_source = 'public'
  for update;
  if appointment.id is null
    or appointment.status <> 'booked'
    or appointment.request_status <> 'pending'
    or decision not in ('approve', 'reject') then
    raise exception 'PUBLIC_BOOKING_DECISION_INVALID';
  end if;
  if decision = 'reject'
    and char_length(coalesce(normalized_reason, '')) not between 3 and 500 then
    raise exception 'DECISION_REASON_REQUIRED';
  end if;

  next_status := case when decision = 'approve' then 'confirmed' else 'cancelled' end;
  update public.appointments set
    status = next_status,
    request_status = case when decision = 'approve' then 'approved' else 'rejected' end,
    request_decided_at = now(),
    request_decided_by = (select auth.uid()),
    request_rejection_reason = case when decision = 'reject' then normalized_reason else null end
  where id = appointment.id
  returning * into appointment;
  insert into public.appointment_status_history (
    organization_id, appointment_id, old_status, new_status,
    changed_by, reason, source
  ) values (
    actor.organization_id, appointment.id, 'booked', next_status,
    (select auth.uid()), normalized_reason, 'public_booking'
  );
  return appointment;
end;
$$;

create or replace function booking_private.get_customer_bookings(
  target_organization_id uuid,
  target_customer_id uuid,
  booking_scope text,
  cursor_starts_at timestamptz,
  cursor_id uuid,
  page_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  organization public.organizations;
  safe_limit integer := least(greatest(coalesce(page_limit, 20), 1), 20);
  records jsonb;
  next_start timestamptz;
  next_id uuid;
  has_more boolean;
begin
  select org.* into organization from public.organizations org
  where org.id = target_organization_id and org.status = 'active'
    and org.public_booking_enabled;
  if organization.id is null
    or booking_scope not in ('upcoming', 'history', 'cancelled')
    or not exists (
      select 1 from public.customers customer
      where customer.organization_id = organization.id
        and customer.id = target_customer_id
    ) then
    return jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null);
  end if;

  with filtered as (
    select
      appointment.*,
      branch.name as branch_name,
      request.id as request_id,
      request.proposed_branch_id,
      proposed_branch.name as proposed_branch_name,
      request.proposed_starts_at,
      request.proposed_ends_at,
      coalesce(nullif(btrim(profile.full_name), ''), 'Staff member')
        as proposed_staff_name
    from public.appointments appointment
    join public.branches branch
      on branch.organization_id = appointment.organization_id
     and branch.id = appointment.branch_id
    left join public.appointment_reschedule_requests request
      on request.organization_id = appointment.organization_id
     and request.appointment_id = appointment.id
     and request.status = 'pending'
    left join public.branches proposed_branch
      on proposed_branch.organization_id = request.organization_id
     and proposed_branch.id = request.proposed_branch_id
    left join public.organization_members proposed_member
      on proposed_member.organization_id = request.organization_id
     and proposed_member.id = request.proposed_membership_id
    left join public.profiles profile on profile.user_id = proposed_member.user_id
    where appointment.organization_id = organization.id
      and appointment.customer_id = target_customer_id
      and (
        (booking_scope = 'upcoming'
          and appointment.status in ('booked', 'confirmed')
          and appointment.ends_at >= now())
        or (booking_scope = 'cancelled' and appointment.status = 'cancelled')
        or (booking_scope = 'history' and appointment.status <> 'cancelled'
          and (appointment.ends_at < now()
            or appointment.status in ('completed', 'no_show')))
      )
      and (cursor_starts_at is null
        or (appointment.starts_at, appointment.id) < (cursor_starts_at, cursor_id))
    order by appointment.starts_at desc, appointment.id desc
    limit safe_limit + 1
  ), page as (
    select * from filtered order by starts_at desc, id desc limit safe_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', page.id,
      'bookingNumber', page.booking_number,
      'serviceId', coalesce(page.service_id, page.package_id),
      'offeringType', page.offering_type,
      'serviceName', page.offering_name,
      'branchId', page.branch_id,
      'branchName', page.branch_name,
      'staffName', page.staff_name,
      'startsAt', page.starts_at,
      'endsAt', page.ends_at,
      'status', page.status,
      'priceBhd', page.price_bhd,
      'canCancel', booking_private.customer_booking_allowed(
        page.status, page.starts_at,
        organization.booking_cancellation_notice_value,
        organization.booking_cancellation_notice_unit
      ),
      'canReschedule', booking_private.customer_booking_allowed(
        page.status, page.starts_at,
        organization.booking_cancellation_notice_value,
        organization.booking_cancellation_notice_unit
      ),
      'refundReviewRequired', page.refund_review_required,
      'pendingReschedule', case when page.request_id is null then null else
        jsonb_build_object(
          'id', page.request_id,
          'branchId', page.proposed_branch_id,
          'branchName', page.proposed_branch_name,
          'startsAt', page.proposed_starts_at,
          'endsAt', page.proposed_ends_at,
          'staffName', page.proposed_staff_name
        ) end
    ) order by page.starts_at desc, page.id desc), '[]'::jsonb),
    (select starts_at from page order by starts_at, id limit 1),
    (select id from page order by starts_at, id limit 1),
    (select count(*) > safe_limit from filtered)
  into records, next_start, next_id, has_more
  from page;

  if has_more then
    return jsonb_build_object(
      'items', records,
      'nextCursor', jsonb_build_object('startsAt', next_start, 'id', next_id)
    );
  end if;
  return jsonb_build_object('items', records, 'nextCursor', null);
end;
$$;

comment on column public.appointment_reschedule_requests.proposed_branch_id is
  'The tenant-scoped branch requested by the customer; the original appointment remains unchanged until approval.';
