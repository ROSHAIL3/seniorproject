-- Appointment request dashboard state, decisions, and pending-count support.
alter table public.appointments
  add column request_status text,
  add column request_decided_at timestamptz,
  add column request_decided_by uuid references auth.users(id) on delete set null,
  add column request_rejection_reason text;

update public.appointments appointment
set
  request_status = case
    when appointment.status = 'booked' then 'pending'
    when appointment.status = 'cancelled' then 'rejected'
    else 'approved'
  end,
  request_decided_at = case
    when appointment.status = 'booked' then null
    else coalesce(
      (
        select history.changed_at
        from public.appointment_status_history history
        where history.appointment_id = appointment.id
          and history.source = 'public_booking'
        order by history.changed_at desc
        limit 1
      ),
      appointment.updated_at
    )
  end,
  request_rejection_reason = case
    when appointment.status = 'cancelled' then (
      select history.reason
      from public.appointment_status_history history
      where history.appointment_id = appointment.id
        and history.new_status = 'cancelled'
      order by history.changed_at desc
      limit 1
    )
    else null
  end
where appointment.booking_source = 'public';

alter table public.appointments
  add constraint appointments_request_status_valid
    check (request_status is null or request_status in ('pending', 'approved', 'rejected')),
  add constraint appointments_request_rejection_reason_length
    check (
      request_rejection_reason is null
      or char_length(request_rejection_reason) between 3 and 500
    ),
  add constraint appointments_public_request_state_consistent
    check (
      (booking_source = 'public' and request_status is not null)
      or (booking_source <> 'public' and request_status is null)
    );

create index appointments_organization_request_status_created_idx
  on public.appointments (organization_id, request_status, created_at desc)
  where booking_source = 'public';

create or replace function booking_private.force_public_booking_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.booking_source = 'public' then
    new.status := 'booked';
    new.request_status := 'pending';
    new.request_decided_at := null;
    new.request_decided_by := null;
    new.request_rejection_reason := null;
  end if;
  return new;
end;
$$;

create or replace function booking_private.sync_public_booking_request_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.booking_source = 'public'
    and old.request_status = 'pending'
    and new.request_status = 'pending'
    and new.status = 'cancelled' then
    new.request_status := 'rejected';
    new.request_decided_at := now();
    new.request_decided_by := null;
    new.request_rejection_reason := coalesce(
      new.request_rejection_reason,
      'Cancelled by customer'
    );
  elsif new.booking_source = 'public'
    and old.request_status = 'pending'
    and new.request_status = 'pending'
    and new.status in ('confirmed', 'completed', 'no_show') then
    new.request_status := 'approved';
    new.request_decided_at := now();
    new.request_decided_by := (select auth.uid());
    new.request_rejection_reason := null;
  end if;
  return new;
end;
$$;

create trigger appointments_sync_public_booking_request_state
before update of status on public.appointments
for each row execute function booking_private.sync_public_booking_request_state();

revoke all on function booking_private.sync_public_booking_request_state()
  from public;

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
    and normalized_reason is not null
    and char_length(normalized_reason) not between 3 and 500 then
    raise exception 'DECISION_REASON_INVALID';
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
        and booking_source = 'public'
        and request_status = 'pending'
    ),
    'reschedules', (
      select count(*) from public.appointment_reschedule_requests
      where organization_id = actor.organization_id and status = 'pending'
    )
  );
end;
$$;

comment on column public.appointments.request_status is
  'Independent lifecycle of a customer-submitted appointment request.';
comment on column public.appointments.request_rejection_reason is
  'Optional staff-provided reason when a public appointment request is rejected.';
