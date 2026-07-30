create type public.reschedule_request_status as enum (
  'pending', 'approved', 'rejected', 'withdrawn'
);

alter table public.appointments
  add column public_access_code_hash text,
  add column refund_review_required boolean not null default false;

alter table public.appointments
  add constraint appointments_public_access_code_hash
  check (
    public_access_code_hash is null
    or public_access_code_hash ~ '^[a-f0-9]{64}$'
  );

create index appointments_public_access_lookup
  on public.appointments (
    organization_id, customer_id, public_access_code_hash
  )
  where public_access_code_hash is not null;

alter table public.appointment_status_history
  add column reason text,
  add column source text not null default 'staff';

alter table public.appointment_status_history
  add constraint appointment_status_history_reason_length
    check (reason is null or char_length(reason) <= 500),
  add constraint appointment_status_history_source
    check (source in ('staff', 'customer', 'public_booking', 'system'));

alter table public.public_booking_attempts
  add column purpose text not null default 'booking';

alter table public.public_booking_attempts
  add constraint public_booking_attempts_purpose
    check (purpose in ('booking', 'login', 'cancel', 'reschedule'));

create index public_booking_attempts_purpose_fingerprint_time
  on public.public_booking_attempts (
    organization_id, purpose, request_fingerprint, attempted_at desc
  );

create table public.appointment_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null,
  proposed_membership_id uuid not null,
  proposed_starts_at timestamptz not null,
  proposed_ends_at timestamptz not null,
  status public.reschedule_request_status not null default 'pending',
  submission_id uuid not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  updated_at timestamptz not null default now(),
  foreign key (organization_id, appointment_id)
    references public.appointments (organization_id, id) on delete cascade,
  foreign key (organization_id, proposed_membership_id)
    references public.organization_members (organization_id, id) on delete restrict,
  unique (organization_id, submission_id),
  check (proposed_ends_at > proposed_starts_at),
  check (
    (status = 'pending' and resolved_at is null and resolved_by is null)
    or (status <> 'pending' and resolved_at is not null)
  ),
  check (
    rejection_reason is null
    or char_length(btrim(rejection_reason)) between 3 and 500
  )
);

create unique index one_pending_reschedule_per_appointment
  on public.appointment_reschedule_requests (organization_id, appointment_id)
  where status = 'pending';

create index reschedule_requests_tenant_status_time
  on public.appointment_reschedule_requests (
    organization_id, status, requested_at desc
  );

create index reschedule_requests_appointment_time
  on public.appointment_reschedule_requests (
    organization_id, appointment_id, requested_at desc
  );

create trigger appointment_reschedule_requests_set_updated_at
before update on public.appointment_reschedule_requests
for each row execute function private.set_updated_at();

create trigger appointment_reschedule_requests_audit_change
after insert or update or delete on public.appointment_reschedule_requests
for each row execute function private.audit_business_change();

alter table public.appointment_reschedule_requests enable row level security;

create policy "members can view appointment reschedule requests"
on public.appointment_reschedule_requests for select to authenticated
using ((select private.is_active_organization_member(organization_id)));

revoke all on table public.appointment_reschedule_requests
  from public, anon, authenticated;
grant select on table public.appointment_reschedule_requests to authenticated;

create or replace function booking_private.access_code_from_token(
  reference_token uuid
)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(
    substr(replace(reference_token::text, '-', ''), 1, 4)
    || '-' ||
    substr(replace(reference_token::text, '-', ''), 5, 4)
    || '-' ||
    substr(replace(reference_token::text, '-', ''), 9, 4)
  );
$$;

create or replace function booking_private.hash_access_code(
  access_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      upper(regexp_replace(coalesce(access_code, ''), '[^A-Fa-f0-9]', '', 'g')),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function booking_private.set_public_access_code_hash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.booking_source = 'public'
    and new.public_reference_token is not null then
    new.public_access_code_hash :=
      booking_private.hash_access_code(
        booking_private.access_code_from_token(new.public_reference_token)
      );
  end if;
  return new;
end;
$$;

create trigger appointments_set_public_access_code
before insert or update of public_reference_token on public.appointments
for each row execute function booking_private.set_public_access_code_hash();

create or replace function booking_private.set_refund_review_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.refund_review_required :=
    new.status = 'cancelled' and new.advance_paid_bhd > 0;
  return new;
end;
$$;

create trigger appointments_set_refund_review
before insert or update of status, advance_paid_bhd on public.appointments
for each row execute function booking_private.set_refund_review_flag();

update public.appointments
set refund_review_required = true
where status = 'cancelled' and advance_paid_bhd > 0;

update public.appointments
set public_access_code_hash = booking_private.hash_access_code(
  booking_private.access_code_from_token(public_reference_token)
)
where booking_source = 'public'
  and public_reference_token is not null
  and public_access_code_hash is null;

create or replace function booking_private.notice_interval(
  notice_value integer,
  notice_unit text
)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case notice_unit
    when 'minutes' then make_interval(mins => notice_value)
    when 'days' then make_interval(days => notice_value)
    else make_interval(hours => notice_value)
  end;
$$;

create or replace function booking_private.register_self_service_attempt(
  target_organization_id uuid,
  target_purpose text,
  target_fingerprint text,
  target_normalized_phone text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_purpose not in ('login', 'cancel', 'reschedule')
    or target_fingerprint !~ '^[a-f0-9]{64}$'
    or char_length(target_normalized_phone) not between 3 and 40 then
    return false;
  end if;

  delete from public.public_booking_attempts
  where attempted_at < now() - interval '24 hours';

  if (
    select count(*) >= 10
    from public.public_booking_attempts attempt
    where attempt.organization_id = target_organization_id
      and attempt.purpose = target_purpose
      and attempt.request_fingerprint = target_fingerprint
      and attempt.attempted_at >= now() - interval '15 minutes'
  ) or (
    select count(*) >= 5
    from public.public_booking_attempts attempt
    where attempt.organization_id = target_organization_id
      and attempt.purpose = target_purpose
      and attempt.normalized_phone = target_normalized_phone
      and attempt.attempted_at >= now() - interval '1 hour'
  ) then
    return false;
  end if;

  insert into public.public_booking_attempts (
    organization_id, request_fingerprint, normalized_phone, purpose
  ) values (
    target_organization_id, target_fingerprint,
    target_normalized_phone, target_purpose
  );
  return true;
end;
$$;

create or replace function booking_private.record_customer_activity(
  target_organization_id uuid,
  target_action text,
  target_type text,
  target_id text,
  target_description text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_logs (
    organization_id, actor_user_id, actor_name, action, category,
    target_type, target_id, description, metadata, source
  ) values (
    target_organization_id, null, 'Customer self-service',
    left(btrim(target_action), 160), 'Appointments',
    left(btrim(target_type), 120), left(btrim(target_id), 160),
    left(btrim(target_description), 500), '{}'::jsonb,
    'customer_self_service'
  );
$$;

create or replace function booking_private.authenticate_customer_bookings(
  booking_slug text,
  customer_phone text,
  access_code text,
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
  normalized_phone text := private.normalized_phone(customer_phone);
  customer_record public.customers;
begin
  if organization.id is null
    or char_length(normalized_phone) not between 3 and 40
    or char_length(regexp_replace(coalesce(access_code, ''), '[^A-Fa-f0-9]', '', 'g')) <> 12
  then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  if not booking_private.register_self_service_attempt(
    organization.id, 'login', request_fingerprint, normalized_phone
  ) then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_RATE_LIMITED');
  end if;

  select customer.* into customer_record
  from public.customers customer
  where customer.organization_id = organization.id
    and customer.normalized_phone = normalized_phone
    and exists (
      select 1 from public.appointments appointment
      where appointment.organization_id = customer.organization_id
        and appointment.customer_id = customer.id
        and appointment.public_access_code_hash =
          booking_private.hash_access_code(access_code)
    )
  limit 1;

  if customer_record.id is null then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  return jsonb_build_object(
    'ok', true,
    'organizationId', organization.id,
    'customerId', customer_record.id
  );
end;
$$;

create or replace function booking_private.authenticate_customer_booking_link(
  booking_slug text,
  reference_token uuid,
  request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment public.appointments;
  organization public.organizations :=
    booking_private.public_booking_organization(booking_slug);
begin
  if organization.id is null or reference_token is null then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  select candidate.* into appointment
  from public.appointments candidate
  where candidate.organization_id = organization.id
    and candidate.booking_source = 'public'
    and candidate.public_reference_token = reference_token;

  if appointment.id is null then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  if not booking_private.register_self_service_attempt(
    organization.id, 'login', request_fingerprint,
    private.normalized_phone(appointment.customer_phone)
  ) then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_RATE_LIMITED');
  end if;

  return jsonb_build_object(
    'ok', true,
    'organizationId', organization.id,
    'customerId', appointment.customer_id
  );
end;
$$;

create or replace function booking_private.customer_booking_allowed(
  appointment_status public.appointment_status,
  appointment_starts_at timestamptz,
  notice_value integer,
  notice_unit text
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select appointment_status in ('booked', 'confirmed')
    and appointment_starts_at > now()
    and appointment_starts_at - now() >=
      booking_private.notice_interval(
        notice_value, notice_unit
      );
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
  select org.* into organization
  from public.organizations org
  where org.id = target_organization_id
    and org.status = 'active'
    and org.public_booking_enabled;
  if organization.id is null or booking_scope not in ('upcoming', 'history', 'cancelled')
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
    left join public.organization_members proposed_member
      on proposed_member.organization_id = request.organization_id
     and proposed_member.id = request.proposed_membership_id
    left join public.profiles profile
      on profile.user_id = proposed_member.user_id
    where appointment.organization_id = organization.id
      and appointment.customer_id = target_customer_id
      and (
        (booking_scope = 'upcoming'
          and appointment.status in ('booked', 'confirmed')
          and appointment.ends_at >= now())
        or (booking_scope = 'cancelled' and appointment.status = 'cancelled')
        or (booking_scope = 'history'
          and appointment.status <> 'cancelled'
          and (
            appointment.ends_at < now()
            or appointment.status in ('completed', 'no_show')
          ))
      )
      and (
        cursor_starts_at is null
        or (appointment.starts_at, appointment.id) <
          (cursor_starts_at, cursor_id)
      )
    order by appointment.starts_at desc, appointment.id desc
    limit safe_limit + 1
  ), page as (
    select * from filtered
    order by starts_at desc, id desc
    limit safe_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', page.id,
      'bookingNumber', page.booking_number,
      'serviceId', page.service_id,
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
      'canReschedule',
        page.service_id is not null
        and booking_private.customer_booking_allowed(
          page.status, page.starts_at,
          organization.booking_cancellation_notice_value,
          organization.booking_cancellation_notice_unit
        ),
      'refundReviewRequired', page.refund_review_required,
      'pendingReschedule', case when page.request_id is null then null else
        jsonb_build_object(
          'id', page.request_id,
          'startsAt', page.proposed_starts_at,
          'endsAt', page.proposed_ends_at,
          'staffName', page.proposed_staff_name
        )
      end
    ) order by page.starts_at desc, page.id desc), '[]'::jsonb),
    (select starts_at from page order by starts_at, id limit 1),
    (select id from page order by starts_at, id limit 1)
  ,
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

create or replace function booking_private.cancel_customer_appointment(
  target_organization_id uuid,
  target_customer_id uuid,
  target_appointment_id uuid,
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
begin
  select * into organization from public.organizations
  where id = target_organization_id and status = 'active';
  select * into appointment from public.appointments
  where organization_id = target_organization_id
    and customer_id = target_customer_id
    and id = target_appointment_id
  for update;

  if organization.id is null or appointment.id is null then
    return jsonb_build_object('ok', false, 'error', 'ACTION_NOT_ALLOWED');
  end if;
  if not booking_private.register_self_service_attempt(
    organization.id, 'cancel', request_fingerprint,
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

  update public.appointments set status = 'cancelled'
  where id = appointment.id;
  update public.appointment_reschedule_requests set
    status = 'withdrawn', resolved_at = now(), rejection_reason = null
  where organization_id = organization.id
    and appointment_id = appointment.id
    and status = 'pending';
  insert into public.appointment_status_history (
    organization_id, appointment_id, old_status, new_status,
    reason, source
  ) values (
    organization.id, appointment.id, appointment.status, 'cancelled',
    'Cancelled by customer', 'customer'
  );
  perform booking_private.record_customer_activity(
    organization.id, 'Appointment cancelled by customer',
    'appointment', appointment.id::text,
    'Customer cancelled appointment ' || appointment.booking_number
  );

  return jsonb_build_object(
    'ok', true,
    'refundReviewRequired', appointment.advance_paid_bhd > 0
  );
end;
$$;

create or replace function booking_private.request_customer_reschedule(
  target_organization_id uuid,
  target_customer_id uuid,
  target_appointment_id uuid,
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
begin
  select * into organization from public.organizations
  where id = target_organization_id and status = 'active'
    and public_booking_enabled;
  select * into appointment from public.appointments
  where organization_id = target_organization_id
    and customer_id = target_customer_id
    and id = target_appointment_id
  for update;

  if organization.id is null or appointment.id is null
    or appointment.service_id is null or target_submission_id is null then
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
    organization.slug, appointment.branch_id, appointment.service_id,
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
    organization_id, appointment_id, proposed_membership_id,
    proposed_starts_at, proposed_ends_at, submission_id
  ) values (
    organization.id, appointment.id, selected_staff.id,
    target_start_at, (selected_slot ->> 'endAt')::timestamptz,
    target_submission_id
  ) returning * into result;
  perform booking_private.record_customer_activity(
    organization.id, 'Reschedule requested by customer',
    'appointment_reschedule_request', result.id::text,
    'Customer requested a new time for appointment ' ||
      appointment.booking_number
  );

  return jsonb_build_object('ok', true, 'requestId', result.id);
end;
$$;

create or replace function booking_private.appointment_actor()
returns public.organization_members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
begin
  if actor.id is null or not private.can_module(actor, 'Appointments', 'edit') then
    raise exception 'APPOINTMENT_FORBIDDEN';
  end if;
  return actor;
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
begin
  select * into appointment from public.appointments
  where organization_id = actor.organization_id
    and id = target_appointment_id
    and booking_source = 'public'
  for update;
  if appointment.id is null or appointment.status <> 'booked'
    or decision not in ('approve', 'reject') then
    raise exception 'PUBLIC_BOOKING_DECISION_INVALID';
  end if;
  if decision = 'reject'
    and char_length(btrim(coalesce(decision_reason, ''))) not between 3 and 500 then
    raise exception 'DECISION_REASON_REQUIRED';
  end if;

  next_status := case when decision = 'approve' then 'confirmed' else 'cancelled' end;
  update public.appointments set status = next_status
  where id = appointment.id returning * into appointment;
  insert into public.appointment_status_history (
    organization_id, appointment_id, old_status, new_status,
    changed_by, reason, source
  ) values (
    actor.organization_id, appointment.id, 'booked', next_status,
    (select auth.uid()), nullif(btrim(coalesce(decision_reason, '')), ''),
    'public_booking'
  );
  return appointment;
end;
$$;

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
      appointment.branch_id, appointment.service_id,
      request.proposed_starts_at, request.proposed_ends_at
    );
    select coalesce(nullif(btrim(profile.full_name), ''), appointment.staff_name)
      into staff_name_value
    from public.profiles profile where profile.user_id = staff.user_id;
    update public.appointments set
      membership_id = staff.id,
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

create or replace function booking_private.get_pending_booking_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := booking_private.appointment_actor();
begin
  return jsonb_build_object(
    'publicBookings', (
      select count(*) from public.appointments
      where organization_id = actor.organization_id
        and booking_source = 'public' and status = 'booked'
    ),
    'reschedules', (
      select count(*) from public.appointment_reschedule_requests
      where organization_id = actor.organization_id and status = 'pending'
    )
  );
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
    'timeZone', organization.time_zone,
    'accessCode',
      booking_private.access_code_from_token(appointment.public_reference_token)
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

create or replace function public.authenticate_customer_bookings(
  booking_slug text, customer_phone text, access_code text,
  request_fingerprint text
)
returns jsonb language sql security invoker set search_path = ''
as $$ select booking_private.authenticate_customer_bookings(
  booking_slug, customer_phone, access_code, request_fingerprint
); $$;

create or replace function public.authenticate_customer_booking_link(
  booking_slug text, reference_token uuid, request_fingerprint text
)
returns jsonb language sql security invoker set search_path = ''
as $$ select booking_private.authenticate_customer_booking_link(
  booking_slug, reference_token, request_fingerprint
); $$;

create or replace function public.get_customer_bookings(
  target_organization_id uuid, target_customer_id uuid, booking_scope text,
  cursor_starts_at timestamptz, cursor_id uuid, page_limit integer
)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select booking_private.get_customer_bookings(
  target_organization_id, target_customer_id, booking_scope,
  cursor_starts_at, cursor_id, page_limit
); $$;

create or replace function public.cancel_customer_appointment(
  target_organization_id uuid, target_customer_id uuid,
  target_appointment_id uuid, request_fingerprint text
)
returns jsonb language sql security invoker set search_path = ''
as $$ select booking_private.cancel_customer_appointment(
  target_organization_id, target_customer_id,
  target_appointment_id, request_fingerprint
); $$;

create or replace function public.request_customer_reschedule(
  target_organization_id uuid, target_customer_id uuid,
  target_appointment_id uuid, target_staff_key text,
  target_start_at timestamptz, target_submission_id uuid,
  request_fingerprint text
)
returns jsonb language sql security invoker set search_path = ''
as $$ select booking_private.request_customer_reschedule(
  target_organization_id, target_customer_id, target_appointment_id,
  target_staff_key, target_start_at, target_submission_id, request_fingerprint
); $$;

create or replace function public.decide_public_booking(
  target_appointment_id uuid, decision text, decision_reason text
)
returns public.appointments language sql security invoker set search_path = ''
as $$ select booking_private.decide_public_booking(
  target_appointment_id, decision, decision_reason
); $$;

create or replace function public.decide_reschedule_request(
  target_request_id uuid, decision text, decision_reason text
)
returns public.appointment_reschedule_requests
language sql security invoker set search_path = ''
as $$ select booking_private.decide_reschedule_request(
  target_request_id, decision, decision_reason
); $$;

create or replace function public.get_pending_booking_counts()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select booking_private.get_pending_booking_counts(); $$;

revoke all on function booking_private.access_code_from_token(uuid) from public;
revoke all on function booking_private.hash_access_code(text) from public;
revoke all on function booking_private.set_public_access_code_hash() from public;
revoke all on function booking_private.set_refund_review_flag() from public;
revoke all on function booking_private.notice_interval(integer, text) from public;
revoke all on function booking_private.register_self_service_attempt(uuid, text, text, text) from public;
revoke all on function booking_private.record_customer_activity(uuid, text, text, text, text) from public;
revoke all on function booking_private.authenticate_customer_bookings(text, text, text, text) from public;
revoke all on function booking_private.authenticate_customer_booking_link(text, uuid, text) from public;
revoke all on function booking_private.customer_booking_allowed(
  public.appointment_status, timestamptz, integer, text
) from public;
revoke all on function booking_private.get_customer_bookings(uuid, uuid, text, timestamptz, uuid, integer) from public;
revoke all on function booking_private.cancel_customer_appointment(uuid, uuid, uuid, text) from public;
revoke all on function booking_private.request_customer_reschedule(uuid, uuid, uuid, text, timestamptz, uuid, text) from public;
revoke all on function booking_private.appointment_actor() from public;
revoke all on function booking_private.decide_public_booking(uuid, text, text) from public;
revoke all on function booking_private.decide_reschedule_request(uuid, text, text) from public;
revoke all on function booking_private.get_pending_booking_counts() from public;

revoke all on function public.authenticate_customer_bookings(text, text, text, text) from public;
revoke all on function public.authenticate_customer_booking_link(text, uuid, text) from public;
revoke all on function public.get_customer_bookings(uuid, uuid, text, timestamptz, uuid, integer) from public;
revoke all on function public.cancel_customer_appointment(uuid, uuid, uuid, text) from public;
revoke all on function public.request_customer_reschedule(uuid, uuid, uuid, text, timestamptz, uuid, text) from public;
revoke all on function public.decide_public_booking(uuid, text, text) from public;
revoke all on function public.decide_reschedule_request(uuid, text, text) from public;
revoke all on function public.get_pending_booking_counts() from public;

grant execute on function booking_private.authenticate_customer_bookings(text, text, text, text) to service_role;
grant execute on function booking_private.authenticate_customer_booking_link(text, uuid, text) to service_role;
grant execute on function booking_private.get_customer_bookings(uuid, uuid, text, timestamptz, uuid, integer) to service_role;
grant execute on function booking_private.cancel_customer_appointment(uuid, uuid, uuid, text) to service_role;
grant execute on function booking_private.request_customer_reschedule(uuid, uuid, uuid, text, timestamptz, uuid, text) to service_role;
grant execute on function booking_private.decide_public_booking(uuid, text, text) to authenticated;
grant execute on function booking_private.decide_reschedule_request(uuid, text, text) to authenticated;
grant execute on function booking_private.get_pending_booking_counts() to authenticated;

grant execute on function public.authenticate_customer_bookings(text, text, text, text) to service_role;
grant execute on function public.authenticate_customer_booking_link(text, uuid, text) to service_role;
grant execute on function public.get_customer_bookings(uuid, uuid, text, timestamptz, uuid, integer) to service_role;
grant execute on function public.cancel_customer_appointment(uuid, uuid, uuid, text) to service_role;
grant execute on function public.request_customer_reschedule(uuid, uuid, uuid, text, timestamptz, uuid, text) to service_role;
grant execute on function public.decide_public_booking(uuid, text, text) to authenticated;
grant execute on function public.decide_reschedule_request(uuid, text, text) to authenticated;
grant execute on function public.get_pending_booking_counts() to authenticated;

comment on table public.appointment_reschedule_requests is
  'Customer-proposed appointment moves. The original slot remains reserved until an authorized member approves.';
