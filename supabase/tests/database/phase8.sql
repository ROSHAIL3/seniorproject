begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase8-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase8-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name)
values
  ('e1000000-0000-4000-8000-000000000001', 'phase8-owner@example.test', 'Public Booking Owner'),
  ('e1000000-0000-4000-8000-000000000002', 'phase8-other@example.test', 'Other Owner')
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name;

insert into public.organizations (
  id, name, slug, public_booking_enabled, created_by
)
values
  ('e2000000-0000-4000-8000-000000000001', 'Public Booking A', 'public-booking-a', true, 'e1000000-0000-4000-8000-000000000001'),
  ('e2000000-0000-4000-8000-000000000002', 'Public Booking B', 'public-booking-b', false, 'e1000000-0000-4000-8000-000000000002');

insert into public.branches (id, organization_id, name, code, is_main)
values
  ('e3000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('e3000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by,
  primary_branch_id
)
values
  ('e4000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'public-owner', 'owner', 'active', 'e1000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001'),
  ('e4000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'other-owner', 'owner', 'active', 'e1000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000002');

insert into public.service_categories (id, organization_id, name)
values
  ('e5000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Hair');

insert into public.services (
  id, organization_id, category_id, name, duration_minutes, price_bhd
)
values (
  'phase8-cut', 'e2000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000001', 'Public Cut', 45, 18.000
);

insert into public.service_branches (organization_id, service_id, branch_id)
values (
  'e2000000-0000-4000-8000-000000000001', 'phase8-cut',
  'e3000000-0000-4000-8000-000000000001'
);

insert into public.service_staff (organization_id, service_id, membership_id)
values (
  'e2000000-0000-4000-8000-000000000001', 'phase8-cut',
  'e4000000-0000-4000-8000-000000000001'
);

update public.organization_business_hours
set is_open = true, start_time = '09:00', end_time = '18:00',
    break_start_time = null, break_end_time = null
where organization_id = 'e2000000-0000-4000-8000-000000000001';

select ok(
  (select relrowsecurity from pg_class where oid = 'public.public_booking_attempts'::regclass),
  'public booking attempts use RLS'
);
select ok(
  not has_table_privilege('anon', 'public.public_booking_attempts', 'SELECT'),
  'anonymous visitors cannot read booking attempts'
);
select ok(
  not has_table_privilege('anon', 'public.appointments', 'SELECT'),
  'anonymous visitors cannot read appointments'
);
select ok(
  has_function_privilege('anon', 'public.get_public_booking_page(text)', 'EXECUTE'),
  'anonymous visitors can execute the reduced public page RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_public_booking(text,uuid,text,text,timestamptz,text,text,text,text,jsonb,uuid,text)',
    'EXECUTE'
  ),
  'anonymous visitors cannot execute the booking write directly'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  public.get_public_booking_page('public-booking-a')
    -> 'organization' ->> 'name',
  'Public Booking A',
  'an enabled organization is available by its exact slug'
);
select is(
  public.get_public_booking_page('public-booking-b'),
  null,
  'a disabled public page is not exposed'
);
select is(
  jsonb_array_length(
    public.get_public_booking_page('public-booking-a') -> 'services'
  ),
  1,
  'the public catalog includes only the tenant service'
);
select ok(
  jsonb_array_length(public.get_public_booking_availability(
    'public-booking-a',
    'e3000000-0000-4000-8000-000000000001',
    'phase8-cut',
    ((now() at time zone 'Asia/Bahrain')::date + 1)
  )) > 0,
  'availability returns valid future staff slots'
);
select is(
  public.get_public_booking_availability(
    'public-booking-a',
    'e3000000-0000-4000-8000-000000000002',
    'phase8-cut',
    ((now() at time zone 'Asia/Bahrain')::date + 1)
  ) ->> 'error',
  'BRANCH_INVALID',
  'availability rejects another organization branch'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select is(
  public.create_public_booking(
    'public-booking-a',
    'e3000000-0000-4000-8000-000000000001',
    'phase8-cut',
    'public-owner',
    (
      ((now() at time zone 'Asia/Bahrain')::date + 1) + time '09:00'
    ) at time zone 'Asia/Bahrain',
    'Public Customer',
    '+973 3900 1111',
    'public-customer@example.test',
    '',
    '{}'::jsonb,
    'e6000000-0000-4000-8000-000000000001',
    repeat('a', 64)
  ) ->> 'status',
  'booked',
  'manual-approval public booking is created as booked'
);
select is(
  (select count(*)::integer from public.appointments
   where organization_id = 'e2000000-0000-4000-8000-000000000001'),
  1,
  'one public appointment is persisted'
);
select is(
  (select booking_source from public.appointments
   where organization_id = 'e2000000-0000-4000-8000-000000000001'),
  'public',
  'the appointment records its public source'
);
select is(
  (select count(*)::integer from public.customers
   where organization_id = 'e2000000-0000-4000-8000-000000000001'),
  1,
  'the public customer is persisted in the correct tenant'
);
select is(
  public.create_public_booking(
    'public-booking-a',
    'e3000000-0000-4000-8000-000000000001',
    'phase8-cut',
    'public-owner',
    (
      ((now() at time zone 'Asia/Bahrain')::date + 1) + time '09:00'
    ) at time zone 'Asia/Bahrain',
    'Public Customer',
    '+973 3900 1111',
    'public-customer@example.test',
    '',
    '{}'::jsonb,
    'e6000000-0000-4000-8000-000000000001',
    repeat('a', 64)
  ) ->> 'bookingNumber',
  (select booking_number from public.appointments
   where organization_id = 'e2000000-0000-4000-8000-000000000001'),
  'repeating a submission is idempotent'
);
select is(
  (select count(*)::integer from public.appointments
   where organization_id = 'e2000000-0000-4000-8000-000000000001'),
  1,
  'idempotency prevents a duplicate appointment'
);
select ok(
  public.get_public_booking_confirmation(
    'public-booking-a',
    (select public_reference_token from public.appointments
     where organization_id = 'e2000000-0000-4000-8000-000000000001')
  ) ->> 'bookingNumber' is not null,
  'the opaque reference token loads a reduced confirmation'
);
select is(
  public.get_public_booking_confirmation(
    'public-booking-b',
    (select public_reference_token from public.appointments
     where organization_id = 'e2000000-0000-4000-8000-000000000001')
  ),
  null,
  'a confirmation token cannot cross organization slugs'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$
    select public.update_general_appointment_settings(
      false, true, 2, 'hours'
    )
  $$,
  'an authorized owner can persist public booking settings'
);
select ok(
  (select booking_auto_confirm and not booking_allow_same_day
   from public.organizations
   where id = 'e2000000-0000-4000-8000-000000000001'),
  'saved public booking settings are stored on the organization'
);

select * from finish();
rollback;
