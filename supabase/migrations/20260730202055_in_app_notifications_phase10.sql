create type public.notification_category as enum (
  'booking', 'payment', 'staff', 'system'
);
create type public.notification_severity as enum (
  'info', 'success', 'warning', 'error'
);

create table public.notification_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  staff_enabled boolean not null default true,
  system_enabled boolean not null default true,
  retention_days smallint not null default 30
    check (retention_days between 7 and 90),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 3 and 80),
  category public.notification_category not null,
  severity public.notification_severity not null default 'info',
  title text not null check (char_length(btrim(title)) between 3 and 160),
  detail text not null default '' check (char_length(detail) <= 500),
  href text check (
    href is null
    or (char_length(href) between 1 and 300 and href like '/%')
  ),
  target_type text check (target_type is null or char_length(target_type) <= 80),
  target_id text check (target_id is null or char_length(target_id) <= 160),
  dedupe_key text not null check (char_length(dedupe_key) between 3 and 200),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (organization_id, recipient_user_id, dedupe_key)
);

create index notifications_recipient_unread_time
  on public.notifications (
    organization_id, recipient_user_id, created_at desc, id desc
  )
  where read_at is null;
create index notifications_recipient_category_time
  on public.notifications (
    organization_id, recipient_user_id, category, created_at desc, id desc
  );
create index notifications_expiry
  on public.notifications (expires_at);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

create policy "members read their notification preferences"
on public.notification_preferences for select to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_active_organization_member(organization_id))
);

create policy "members read their notifications"
on public.notifications for select to authenticated
using (
  recipient_user_id = (select auth.uid())
  and (select private.is_active_organization_member(organization_id))
);

revoke all on table public.notification_preferences, public.notifications
  from public, anon, authenticated;
grant select on table public.notification_preferences, public.notifications
  to authenticated;

create or replace function private.notification_actor()
returns public.organization_members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
begin
  if actor.id is null then raise exception 'AUTH_REQUIRED'; end if;
  return actor;
end;
$$;

create or replace function private.cleanup_notifications(
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
  with expired as (
    select notification.id
    from public.notifications notification
    where notification.organization_id = target_organization_id
      and notification.expires_at <= now()
    order by notification.expires_at
    limit 200
  )
  delete from public.notifications notification
  using expired
  where notification.id = expired.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function private.enqueue_notification(
  target_organization_id uuid,
  target_event_key text,
  target_category public.notification_category,
  target_severity public.notification_severity,
  target_title text,
  target_detail text,
  target_href text,
  target_type text,
  target_id text,
  target_dedupe_key text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare inserted_count integer;
begin
  perform private.cleanup_notifications(target_organization_id);

  insert into public.notifications (
    organization_id, recipient_user_id, event_key, category, severity,
    title, detail, href, target_type, target_id, dedupe_key, expires_at
  )
  select
    target_organization_id,
    membership.user_id,
    left(btrim(target_event_key), 80),
    target_category,
    target_severity,
    left(btrim(target_title), 160),
    left(btrim(coalesce(target_detail, '')), 500),
    nullif(left(btrim(coalesce(target_href, '')), 300), ''),
    nullif(left(btrim(coalesce(target_type, '')), 80), ''),
    nullif(left(btrim(coalesce(target_id, '')), 160), ''),
    left(btrim(target_dedupe_key), 200),
    now() + make_interval(days => coalesce(preference.retention_days, 30))
  from public.organization_members membership
  left join public.notification_preferences preference
    on preference.organization_id = membership.organization_id
   and preference.user_id = membership.user_id
  where membership.organization_id = target_organization_id
    and membership.status = 'active'
    and membership.user_id is not null
    and (
      membership.role in ('owner', 'admin')
      or (
        target_category = 'booking'
        and (
          private.can_module(membership, 'Appointments', 'view')
          or private.can_module(membership, 'Appointments', 'edit')
        )
      )
      or (
        target_category = 'payment'
        and (
          private.can_module(membership, 'Invoices', 'view')
          or private.can_module(membership, 'Invoices', 'edit')
        )
      )
      or target_category in ('staff', 'system')
    )
    and case target_category
      when 'booking' then coalesce(preference.booking_enabled, true)
      when 'payment' then coalesce(preference.payment_enabled, true)
      when 'staff' then coalesce(preference.staff_enabled, true)
      else coalesce(preference.system_enabled, true)
    end
  on conflict (organization_id, recipient_user_id, dedupe_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function private.get_my_notifications(
  filter_category text,
  unread_only boolean,
  cursor_created_at timestamptz,
  cursor_id uuid,
  page_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.notification_actor();
  safe_limit integer := least(greatest(coalesce(page_limit, 20), 1), 20);
  items jsonb;
  next_created_at timestamptz;
  next_id uuid;
  has_more boolean;
  unread_count integer;
begin
  if filter_category is not null
    and filter_category not in ('booking', 'payment', 'staff', 'system') then
    raise exception 'NOTIFICATION_FILTER_INVALID';
  end if;
  perform private.cleanup_notifications(actor.organization_id);

  with filtered as (
    select notification.*
    from public.notifications notification
    where notification.organization_id = actor.organization_id
      and notification.recipient_user_id = (select auth.uid())
      and (filter_category is null or notification.category::text = filter_category)
      and (not coalesce(unread_only, false) or notification.read_at is null)
      and (
        cursor_created_at is null
        or (notification.created_at, notification.id) <
          (cursor_created_at, cursor_id)
      )
    order by notification.created_at desc, notification.id desc
    limit safe_limit + 1
  ), page as (
    select * from filtered
    order by created_at desc, id desc
    limit safe_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', page.id,
      'eventKey', page.event_key,
      'category', page.category,
      'severity', page.severity,
      'title', page.title,
      'detail', page.detail,
      'href', page.href,
      'targetType', page.target_type,
      'targetId', page.target_id,
      'readAt', page.read_at,
      'createdAt', page.created_at
    ) order by page.created_at desc, page.id desc), '[]'::jsonb),
    (select created_at from page order by created_at, id limit 1),
    (select id from page order by created_at, id limit 1),
    (select count(*) > safe_limit from filtered)
  into items, next_created_at, next_id, has_more
  from page;

  select count(*)::integer into unread_count
  from public.notifications notification
  where notification.organization_id = actor.organization_id
    and notification.recipient_user_id = (select auth.uid())
    and notification.read_at is null;

  return jsonb_build_object(
    'items', items,
    'unreadCount', unread_count,
    'nextCursor', case when has_more then jsonb_build_object(
      'createdAt', next_created_at, 'id', next_id
    ) else null end
  );
end;
$$;

create or replace function private.mark_notification_read(
  target_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor public.organization_members := private.notification_actor();
begin
  update public.notifications set read_at = coalesce(read_at, now())
  where organization_id = actor.organization_id
    and recipient_user_id = (select auth.uid())
    and id = target_notification_id;
  return found;
end;
$$;

create or replace function private.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.notification_actor();
  changed integer;
begin
  update public.notifications set read_at = now()
  where organization_id = actor.organization_id
    and recipient_user_id = (select auth.uid())
    and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function private.get_notification_preferences()
returns public.notification_preferences
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.notification_actor();
  result public.notification_preferences;
begin
  insert into public.notification_preferences (organization_id, user_id)
  values (actor.organization_id, (select auth.uid()))
  on conflict (organization_id, user_id) do nothing;
  select * into result from public.notification_preferences
  where organization_id = actor.organization_id
    and user_id = (select auth.uid());
  return result;
end;
$$;

create or replace function private.update_notification_preferences(
  target_booking_enabled boolean,
  target_payment_enabled boolean,
  target_staff_enabled boolean,
  target_system_enabled boolean,
  target_retention_days integer
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.notification_actor();
  result public.notification_preferences;
begin
  if target_retention_days not between 7 and 90 then
    raise exception 'NOTIFICATION_RETENTION_INVALID';
  end if;
  insert into public.notification_preferences (
    organization_id, user_id, booking_enabled, payment_enabled,
    staff_enabled, system_enabled, retention_days
  ) values (
    actor.organization_id, (select auth.uid()),
    coalesce(target_booking_enabled, true),
    coalesce(target_payment_enabled, true),
    coalesce(target_staff_enabled, true),
    coalesce(target_system_enabled, true),
    target_retention_days
  )
  on conflict (organization_id, user_id) do update set
    booking_enabled = excluded.booking_enabled,
    payment_enabled = excluded.payment_enabled,
    staff_enabled = excluded.staff_enabled,
    system_enabled = excluded.system_enabled,
    retention_days = excluded.retention_days
  returning * into result;

  update public.notifications
  set expires_at = least(
    expires_at,
    created_at + make_interval(days => result.retention_days)
  )
  where organization_id = actor.organization_id
    and recipient_user_id = (select auth.uid());
  perform private.cleanup_notifications(actor.organization_id);
  return result;
end;
$$;

create or replace function private.notify_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.enqueue_notification(
      new.organization_id,
      case when new.booking_source = 'public'
        then 'public_booking_created' else 'appointment_created' end,
      'booking',
      case when new.booking_source = 'public' and new.status = 'booked'
        then 'warning'::public.notification_severity
        else 'success'::public.notification_severity end,
      case when new.booking_source = 'public' and new.status = 'booked'
        then 'Public booking needs approval' else 'New appointment created' end,
      new.booking_number || ' · ' || new.customer_name || ' · ' ||
        new.offering_name,
      '/appointments/' || new.booking_number,
      'appointment', new.id::text,
      'appointment-created:' || new.id::text
    );
    return new;
  end if;

  if old.status is distinct from new.status and new.status = 'cancelled' then
    perform private.enqueue_notification(
      new.organization_id, 'appointment_cancelled', 'booking', 'warning',
      'Appointment cancelled',
      new.booking_number || ' · ' || new.customer_name || ' · ' ||
        new.offering_name,
      '/appointments/' || new.booking_number,
      'appointment', new.id::text,
      'appointment-cancelled:' || new.id::text
    );
  elsif old.status = 'booked' and new.status = 'confirmed' then
    perform private.enqueue_notification(
      new.organization_id, 'public_booking_approved', 'booking', 'success',
      'Booking approved',
      new.booking_number || ' is now confirmed',
      '/appointments/' || new.booking_number,
      'appointment', new.id::text,
      'booking-approved:' || new.id::text
    );
  end if;

  if (old.starts_at, old.ends_at, old.membership_id)
    is distinct from (new.starts_at, new.ends_at, new.membership_id) then
    perform private.enqueue_notification(
      new.organization_id, 'appointment_rescheduled', 'booking', 'info',
      'Appointment rescheduled',
      new.booking_number || ' · ' || new.customer_name,
      '/appointments/' || new.booking_number,
      'appointment', new.id::text,
      'appointment-rescheduled:' || new.id::text || ':' ||
        extract(epoch from new.starts_at)::bigint::text
    );
  end if;

  if not old.refund_review_required and new.refund_review_required then
    perform private.enqueue_notification(
      new.organization_id, 'refund_review_required', 'payment', 'error',
      'Manual refund review required',
      new.booking_number || ' has an advance payment',
      '/appointments/' || new.booking_number,
      'appointment', new.id::text,
      'refund-review:' || new.id::text
    );
  end if;
  return new;
end;
$$;

create trigger appointments_notify_change
after insert or update on public.appointments
for each row execute function private.notify_appointment_change();

create or replace function private.notify_reschedule_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare appointment public.appointments;
begin
  select * into appointment from public.appointments
  where organization_id = new.organization_id and id = new.appointment_id;
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.enqueue_notification(
      new.organization_id, 'reschedule_requested', 'booking', 'warning',
      'Reschedule request needs approval',
      appointment.booking_number || ' · ' || appointment.customer_name,
      '/appointments/' || appointment.booking_number,
      'appointment_reschedule_request', new.id::text,
      'reschedule-request:' || new.id::text
    );
  elsif tg_op = 'UPDATE' and old.status = 'pending'
    and new.status in ('approved', 'rejected') then
    perform private.enqueue_notification(
      new.organization_id, 'reschedule_decided', 'booking', 'info',
      case new.status when 'approved' then 'Reschedule approved'
        else 'Reschedule rejected' end,
      appointment.booking_number || ' · ' || appointment.customer_name,
      '/appointments/' || appointment.booking_number,
      'appointment_reschedule_request', new.id::text,
      'reschedule-decision:' || new.id::text
    );
  end if;
  return new;
end;
$$;

create trigger reschedule_requests_notify_change
after insert or update on public.appointment_reschedule_requests
for each row execute function private.notify_reschedule_change();

create or replace function private.notify_payment_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reference_value text;
  href_value text;
begin
  if new.invoice_id is not null then
    select invoice.invoice_number, '/invoices/' || invoice.invoice_number
      into reference_value, href_value
    from public.invoices invoice
    where invoice.organization_id = new.organization_id
      and invoice.id = new.invoice_id;
  else
    select appointment.booking_number,
      '/appointments/' || appointment.booking_number
      into reference_value, href_value
    from public.appointments appointment
    where appointment.organization_id = new.organization_id
      and appointment.id = new.appointment_id;
  end if;
  perform private.enqueue_notification(
    new.organization_id,
    case new.kind when 'refund' then 'refund_recorded'
      else 'payment_recorded' end,
    'payment',
    case new.kind when 'refund' then 'warning'::public.notification_severity
      else 'success'::public.notification_severity end,
    case new.kind when 'refund' then 'Refund recorded'
      else 'Payment recorded' end,
    coalesce(reference_value, 'Transaction') || ' · ' ||
      to_char(new.amount_bhd, 'FM999999990.000') || ' BHD',
    href_value, 'payment_transaction', new.id::text,
    'payment-transaction:' || new.id::text
  );
  return new;
end;
$$;

create trigger payment_transactions_notify_insert
after insert on public.payment_transactions
for each row execute function private.notify_payment_transaction();

create or replace function public.get_my_notifications(
  filter_category text default null,
  unread_only boolean default false,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  page_limit integer default 20
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.get_my_notifications(
  filter_category, unread_only, cursor_created_at, cursor_id, page_limit
); $$;

create or replace function public.mark_notification_read(
  target_notification_id uuid
)
returns boolean language sql security invoker set search_path = ''
as $$ select private.mark_notification_read(target_notification_id); $$;

create or replace function public.mark_all_notifications_read()
returns integer language sql security invoker set search_path = ''
as $$ select private.mark_all_notifications_read(); $$;

create or replace function public.get_notification_preferences()
returns public.notification_preferences
language sql security invoker set search_path = ''
as $$ select private.get_notification_preferences(); $$;

create or replace function public.update_notification_preferences(
  target_booking_enabled boolean,
  target_payment_enabled boolean,
  target_staff_enabled boolean,
  target_system_enabled boolean,
  target_retention_days integer
)
returns public.notification_preferences
language sql security invoker set search_path = ''
as $$ select private.update_notification_preferences(
  target_booking_enabled, target_payment_enabled, target_staff_enabled,
  target_system_enabled, target_retention_days
); $$;

revoke all on function private.notification_actor() from public;
revoke all on function private.cleanup_notifications(uuid) from public;
revoke all on function private.enqueue_notification(
  uuid, text, public.notification_category, public.notification_severity,
  text, text, text, text, text, text
) from public;
revoke all on function private.get_my_notifications(
  text, boolean, timestamptz, uuid, integer
) from public;
revoke all on function private.mark_notification_read(uuid) from public;
revoke all on function private.mark_all_notifications_read() from public;
revoke all on function private.get_notification_preferences() from public;
revoke all on function private.update_notification_preferences(
  boolean, boolean, boolean, boolean, integer
) from public;
revoke all on function private.notify_appointment_change() from public;
revoke all on function private.notify_reschedule_change() from public;
revoke all on function private.notify_payment_transaction() from public;

revoke all on function public.get_my_notifications(
  text, boolean, timestamptz, uuid, integer
) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.get_notification_preferences() from public;
revoke all on function public.update_notification_preferences(
  boolean, boolean, boolean, boolean, integer
) from public;

grant execute on function private.get_my_notifications(
  text, boolean, timestamptz, uuid, integer
) to authenticated;
grant execute on function private.mark_notification_read(uuid) to authenticated;
grant execute on function private.mark_all_notifications_read() to authenticated;
grant execute on function private.get_notification_preferences() to authenticated;
grant execute on function private.update_notification_preferences(
  boolean, boolean, boolean, boolean, integer
) to authenticated;

grant execute on function public.get_my_notifications(
  text, boolean, timestamptz, uuid, integer
) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_notification_preferences() to authenticated;
grant execute on function public.update_notification_preferences(
  boolean, boolean, boolean, boolean, integer
) to authenticated;

comment on table public.notifications is
  'Tenant-scoped in-app operational alerts. No external delivery or Realtime subscription is enabled.';
comment on table public.notification_preferences is
  'Per-user in-app categories and 7-90 day retention. Expired rows are deleted opportunistically without cron.';
