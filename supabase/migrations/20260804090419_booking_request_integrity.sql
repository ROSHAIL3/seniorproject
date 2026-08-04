-- Public bookings are requests, and active appointment ranges must never
-- overlap for either the assigned staff member or the customer. Application
-- checks remain useful for friendly errors; these constraints are the final
-- concurrency-safe guard when requests arrive at the same time.

create extension if not exists btree_gist with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_staff_overlap'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_no_staff_overlap
      exclude using gist (
        organization_id with =,
        membership_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status <> 'cancelled');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_customer_overlap'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_no_customer_overlap
      exclude using gist (
        organization_id with =,
        customer_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status <> 'cancelled');
  end if;
end;
$$;

create or replace function booking_private.force_public_booking_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.booking_source = 'public' then
    new.status := 'booked';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_force_public_booking_request
  on public.appointments;
create trigger appointments_force_public_booking_request
before insert on public.appointments
for each row execute function booking_private.force_public_booking_request();

revoke all on function booking_private.force_public_booking_request()
  from public;

comment on constraint appointments_no_staff_overlap on public.appointments is
  'Prevents concurrent or direct writes from double-booking a staff member.';
comment on constraint appointments_no_customer_overlap on public.appointments is
  'Prevents a customer from holding overlapping active appointments.';
comment on function booking_private.force_public_booking_request() is
  'Ensures every public booking starts as a pending booked request.';
