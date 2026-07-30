begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'fa100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase10-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fa100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase10-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name) values
  ('fa100000-0000-4000-8000-000000000001', 'phase10-owner@example.test', 'Notification Owner'),
  ('fa100000-0000-4000-8000-000000000002', 'phase10-other@example.test', 'Other Owner')
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name;

insert into public.organizations (id, name, slug, created_by) values
  ('fa200000-0000-4000-8000-000000000001', 'Notifications A', 'notifications-a', 'fa100000-0000-4000-8000-000000000001'),
  ('fa200000-0000-4000-8000-000000000002', 'Notifications B', 'notifications-b', 'fa100000-0000-4000-8000-000000000002');

insert into public.branches (id, organization_id, name, code, is_main) values
  ('fa300000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('fa300000-0000-4000-8000-000000000002', 'fa200000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by,
  primary_branch_id
) values
  ('fa400000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001', 'fa100000-0000-4000-8000-000000000001', 'notification-owner', 'owner', 'active', 'fa100000-0000-4000-8000-000000000001', 'fa300000-0000-4000-8000-000000000001'),
  ('fa400000-0000-4000-8000-000000000002', 'fa200000-0000-4000-8000-000000000002', 'fa100000-0000-4000-8000-000000000002', 'other-owner', 'owner', 'active', 'fa100000-0000-4000-8000-000000000002', 'fa300000-0000-4000-8000-000000000002');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  'notifications use RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.notification_preferences'::regclass),
  'notification preferences use RLS'
);
select ok(
  not has_table_privilege('anon', 'public.notifications', 'SELECT'),
  'anonymous visitors cannot read notifications'
);
select ok(
  not has_table_privilege('authenticated', 'public.notifications', 'INSERT'),
  'authenticated users cannot insert notifications directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.notifications', 'UPDATE'),
  'authenticated users cannot update notification rows directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_my_notifications(text,boolean,timestamptz,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated users can call the reviewed inbox function'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_my_notifications(text,boolean,timestamptz,uuid,integer)',
    'EXECUTE'
  ),
  'anonymous visitors cannot execute inbox functions'
);

select is(
  private.enqueue_notification(
    'fa200000-0000-4000-8000-000000000001',
    'phase10_test', 'booking', 'warning',
    'Booking needs attention', 'BK-TEST', '/appointments/BK-TEST',
    'appointment', 'phase10-test', 'phase10:one'
  ),
  1,
  'an operational event creates one notification for the eligible tenant owner'
);
select is(
  private.enqueue_notification(
    'fa200000-0000-4000-8000-000000000001',
    'phase10_test', 'booking', 'warning',
    'Booking needs attention', 'BK-TEST', '/appointments/BK-TEST',
    'appointment', 'phase10-test', 'phase10:one'
  ),
  0,
  'the dedupe key prevents repeated alerts'
);
select is(
  (select count(*)::integer from public.notifications
   where organization_id = 'fa200000-0000-4000-8000-000000000002'),
  0,
  'event creation does not cross tenants'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fa100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  jsonb_array_length(public.get_my_notifications(null, false, null, null, 20) -> 'items'),
  1,
  'the recipient can read their notification'
);
select is(
  public.get_my_notifications(null, false, null, null, 20) ->> 'unreadCount',
  '1',
  'the inbox returns a persistent unread count'
);
select ok(
  public.mark_notification_read(
    (select id from public.notifications
     where organization_id = 'fa200000-0000-4000-8000-000000000001')
  ),
  'the recipient can mark one notification read'
);
select is(
  public.get_my_notifications(null, false, null, null, 20) ->> 'unreadCount',
  '0',
  'marking read updates the unread count'
);
select is(
  (public.get_notification_preferences()).retention_days,
  30::smallint,
  'default preferences use 30-day retention'
);
select is(
  (public.update_notification_preferences(
    false, true, true, true, 7
  )).retention_days,
  7::smallint,
  'a user can select the Free-plan-conscious seven-day retention'
);

reset role;
select is(
  private.enqueue_notification(
    'fa200000-0000-4000-8000-000000000001',
    'disabled_booking', 'booking', 'warning',
    'Should not appear', '', '/notifications',
    'system', 'disabled', 'phase10:disabled'
  ),
  0,
  'disabled booking preferences suppress future booking notifications'
);
select is(
  private.enqueue_notification(
    'fa200000-0000-4000-8000-000000000001',
    'system_test', 'system', 'info',
    'System notice', 'Free-plan test', '/notifications',
    'system', 'phase10-system', 'phase10:system'
  ),
  1,
  'another enabled category still creates notifications'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fa100000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is(
  jsonb_array_length(public.get_my_notifications(null, false, null, null, 20) -> 'items'),
  0,
  'another tenant cannot read the first tenant inbox'
);
select is(
  public.mark_all_notifications_read(),
  0,
  'another tenant cannot mutate the first tenant inbox'
);

select * from finish();
rollback;
