begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(18);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase5-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase5-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name)
values
  ('b1000000-0000-4000-8000-000000000001', 'phase5-owner@example.test', 'Booking Owner'),
  ('b1000000-0000-4000-8000-000000000002', 'phase5-other@example.test', 'Other Owner')
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name;

insert into public.organizations (id, name, slug, created_by)
values
  ('b2000000-0000-4000-8000-000000000001', 'Booking A', 'booking-a', 'b1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000002', 'Booking B', 'booking-b', 'b1000000-0000-4000-8000-000000000002');

insert into public.branches (id, organization_id, name, code, is_main)
values
  ('b3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('b3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by, primary_branch_id
)
values
  ('b4000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'booking-owner', 'owner', 'active', 'b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001'),
  ('b4000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'other-owner', 'owner', 'active', 'b1000000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000002');

select ok((select relrowsecurity from pg_class where oid = 'public.customers'::regclass), 'customers use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.appointments'::regclass), 'appointments use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.appointment_notes'::regclass), 'appointment notes use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.appointment_status_history'::regclass), 'status history uses RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.organization_booking_counters'::regclass), 'booking counters use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.organization_business_hours'::regclass), 'business hours use RLS');
select is((select count(*)::integer from public.organization_business_hours), 14, 'new organizations receive seven business-hour rows');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$ select public.upsert_customer(null, 'Roshail', '+973 3876 4976', 'roshail@example.test', '', 'active', '{}'::jsonb) $$,
  'owner can create a customer'
);
select throws_ok(
  $$ select public.upsert_customer(null, 'Duplicate', '+97338764976', '', '', 'active', '{}'::jsonb) $$,
  'P0001', 'CUSTOMER_DUPLICATE', 'normalized phone is unique per organization'
);
select lives_ok(
  $$ select public.upsert_service_category(null, 'Hair', 'active') $$,
  'owner can create a category for booking'
);
select lives_ok(
  $$
    select public.upsert_catalog_service(
      null, 'Cut', (select id from public.service_categories where name = 'Hair'),
      '', 45, 18.000, true, true, array['booking-owner'],
      array['b3000000-0000-4000-8000-000000000001'::uuid]
    )
  $$,
  'owner can create a bookable service'
);
select lives_ok(
  $$
    select public.upsert_appointment(
      null,
      (select id from public.customers where name = 'Roshail'),
      'booking-owner', 'b3000000-0000-4000-8000-000000000001',
      (select id from public.services where name = 'Cut'),
      '2030-01-07 09:00:00+03', '2030-01-07 09:45:00+03',
      'booked', '', '{}'::jsonb, 'Booking Owner'
    )
  $$,
  'valid appointment is created transactionally'
);
select is((select count(*)::integer from public.appointment_status_history), 1, 'initial status is recorded');
select throws_ok(
  $$
    select public.upsert_appointment(
      null,
      (select id from public.customers where name = 'Roshail'),
      'booking-owner', 'b3000000-0000-4000-8000-000000000001',
      (select id from public.services where name = 'Cut'),
      '2030-01-07 09:15:00+03', '2030-01-07 10:00:00+03',
      'booked', '', '{}'::jsonb, 'Booking Owner'
    )
  $$,
  'P0001', 'STAFF_CONFLICT', 'overlapping staff booking is rejected'
);
select lives_ok(
  $$
    select public.add_appointment_note(
      (select id from public.appointments limit 1), 'Patch test complete.'
    )
  $$,
  'appointment note is persisted'
);
select is((select count(*)::integer from public.appointment_notes), 1, 'one note is visible to the tenant');

select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.customers), 0, 'another organization cannot view customers');
select is((select count(*)::integer from public.appointments), 0, 'another organization cannot view appointments');

select * from finish();
rollback;
