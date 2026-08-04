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
      and attempt.request_fingerprint = $12
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
  ) values (
    organization.id, $12, normalized_customer_phone
  );

  select customer.* into selected_customer
  from public.customers customer
  where customer.organization_id = organization.id
    and customer.normalized_phone = normalized_customer_phone;

  lock_one := hashtextextended(
    organization.id::text
      || case
        when selected_customer.id is null
          then ':public-phone:' || normalized_customer_phone
        else ':customer:' || selected_customer.id::text
      end,
    0
  );
  lock_two := hashtextextended(
    organization.id::text || ':staff:' || target_staff_key, 0
  );
  perform pg_advisory_xact_lock(least(lock_one, lock_two));
  perform pg_advisory_xact_lock(greatest(lock_one, lock_two));

  -- Another request with the same submission ID may have completed while
  -- this transaction waited for the staff/customer locks.
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
      ) values (
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

    if exists (
      select 1
      from public.appointments appointment
      where appointment.organization_id = organization.id
        and appointment.customer_id = selected_customer.id
        and appointment.status <> 'cancelled'
        and appointment.starts_at < (selected_slot ->> 'endAt')::timestamptz
        and appointment.ends_at > target_start_at
    ) then
      return jsonb_build_object(
        'ok', false, 'error', 'BOOKING_CUSTOMER_CONFLICT'
      );
    end if;

    insert into public.organization_booking_counters (
      organization_id, next_number
    ) values (organization.id, 2)
    on conflict (organization_id) do update
      set next_number = public.organization_booking_counters.next_number + 1
    returning next_number - 1 into next_booking_number;

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
    ) values (
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
      'booked',
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
    when exclusion_violation then
      get stacked diagnostics conflict_constraint = constraint_name;
      return jsonb_build_object(
        'ok', false,
        'error', case
          when conflict_constraint = 'appointments_no_customer_overlap'
            then 'BOOKING_CUSTOMER_CONFLICT'
          else 'BOOKING_SLOT_UNAVAILABLE'
        end
      );
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

comment on function booking_private.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text,
  jsonb, uuid, text
) is
  'Creates an idempotent, rate-limited public booking request with shared customer/staff locking and database overlap protection.';

