-- Return composite rows as their individual columns. Selecting the row alias
-- itself produces one composite value, which PostgreSQL then attempts to cast
-- into the first UUID field of the declared return type (SQLSTATE 22P02).

create or replace function private.current_active_membership()
returns public.organization_members
language sql
stable
security definer
set search_path = ''
as $$
  select membership.*
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organization.status = 'active'
  order by membership.created_at
  limit 1;
$$;

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
  select membership.*
    into actor
  from public.organization_members membership
  join public.organizations organization
    on organization.id = membership.organization_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organization.status = 'active'
    and (
      membership.role in ('owner', 'admin')
      or membership.permissions -> 'Services' -> required_action = 'true'::jsonb
    )
  order by membership.created_at
  limit 1;

  if actor.id is null then
    raise exception 'CATALOG_FORBIDDEN';
  end if;

  return actor;
end;
$$;

create or replace function booking_private.public_booking_organization(
  booking_slug text
)
returns public.organizations
language sql
stable
security definer
set search_path = ''
as $$
  select organization.*
  from public.organizations organization
  where organization.slug = lower(btrim(booking_slug))
    and organization.status = 'active'
    and organization.public_booking_enabled
  limit 1;
$$;

create or replace function public.decide_public_booking(
  target_appointment_id uuid,
  decision text,
  decision_reason text
)
returns public.appointments
language sql
security invoker
set search_path = ''
as $$
  select (booking_private.decide_public_booking(
    target_appointment_id,
    decision,
    decision_reason
  )).*;
$$;

create or replace function public.decide_reschedule_request(
  target_request_id uuid,
  decision text,
  decision_reason text
)
returns public.appointment_reschedule_requests
language sql
security invoker
set search_path = ''
as $$
  select (booking_private.decide_reschedule_request(
    target_request_id,
    decision,
    decision_reason
  )).*;
$$;

create or replace function public.get_notification_preferences()
returns public.notification_preferences
language sql
security invoker
set search_path = ''
as $$
  select (private.get_notification_preferences()).*;
$$;

create or replace function public.update_notification_preferences(
  target_booking_enabled boolean,
  target_payment_enabled boolean,
  target_staff_enabled boolean,
  target_system_enabled boolean,
  target_retention_days integer
)
returns public.notification_preferences
language sql
security invoker
set search_path = ''
as $$
  select (private.update_notification_preferences(
    target_booking_enabled,
    target_payment_enabled,
    target_staff_enabled,
    target_system_enabled,
    target_retention_days
  )).*;
$$;
