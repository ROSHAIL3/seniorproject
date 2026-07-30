begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(27);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'f9100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase9-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f9100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase9-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name) values
  ('f9100000-0000-4000-8000-000000000001', 'phase9-owner@example.test', 'Phase Nine Owner'),
  ('f9100000-0000-4000-8000-000000000002', 'phase9-other@example.test', 'Other Owner')
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name;

insert into public.organizations (
  id, name, slug, public_booking_enabled, created_by,
  booking_cancellation_notice_value, booking_cancellation_notice_unit
) values
  ('f9200000-0000-4000-8000-000000000001', 'Self Service A', 'self-service-a', true, 'f9100000-0000-4000-8000-000000000001', 24, 'hours'),
  ('f9200000-0000-4000-8000-000000000002', 'Self Service B', 'self-service-b', true, 'f9100000-0000-4000-8000-000000000002', 24, 'hours');

insert into public.branches (id, organization_id, name, code, is_main) values
  ('f9300000-0000-4000-8000-000000000001', 'f9200000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('f9300000-0000-4000-8000-000000000002', 'f9200000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by,
  primary_branch_id
) values
  ('f9400000-0000-4000-8000-000000000001', 'f9200000-0000-4000-8000-000000000001', 'f9100000-0000-4000-8000-000000000001', 'phase9-owner', 'owner', 'active', 'f9100000-0000-4000-8000-000000000001', 'f9300000-0000-4000-8000-000000000001'),
  ('f9400000-0000-4000-8000-000000000002', 'f9200000-0000-4000-8000-000000000002', 'f9100000-0000-4000-8000-000000000002', 'phase9-other', 'owner', 'active', 'f9100000-0000-4000-8000-000000000002', 'f9300000-0000-4000-8000-000000000002');

insert into public.service_categories (id, organization_id, name)
values ('f9500000-0000-4000-8000-000000000001', 'f9200000-0000-4000-8000-000000000001', 'Hair');
insert into public.services (
  id, organization_id, category_id, name, duration_minutes, price_bhd
) values (
  'phase9-cut', 'f9200000-0000-4000-8000-000000000001',
  'f9500000-0000-4000-8000-000000000001', 'Phase Nine Cut', 45, 18.000
);
insert into public.service_branches (organization_id, service_id, branch_id)
values ('f9200000-0000-4000-8000-000000000001', 'phase9-cut', 'f9300000-0000-4000-8000-000000000001');
insert into public.service_staff (organization_id, service_id, membership_id)
values ('f9200000-0000-4000-8000-000000000001', 'phase9-cut', 'f9400000-0000-4000-8000-000000000001');

update public.organization_business_hours
set is_open = true, start_time = '09:00', end_time = '18:00',
    break_start_time = null, break_end_time = null
where organization_id = 'f9200000-0000-4000-8000-000000000001';

select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.appointment_reschedule_requests'::regclass),
  'reschedule requests use RLS'
);
select ok(
  not has_table_privilege('anon', 'public.appointment_reschedule_requests', 'SELECT'),
  'anonymous visitors cannot read reschedule requests'
);
select ok(
  not has_table_privilege('anon', 'public.appointment_reschedule_requests', 'INSERT'),
  'anonymous visitors cannot write reschedule requests'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.authenticate_customer_bookings(text,text,text,text)',
    'EXECUTE'
  ),
  'anonymous visitors cannot execute customer authentication RPCs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.authenticate_customer_bookings(text,text,text,text)',
    'EXECUTE'
  ),
  'only the server role can execute customer authentication'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select is(
  public.create_public_booking(
    'self-service-a',
    'f9300000-0000-4000-8000-000000000001',
    'phase9-cut',
    'phase9-owner',
    ((((now() at time zone 'Asia/Bahrain')::date + 3) + time '09:00') at time zone 'Asia/Bahrain'),
    'Self Service Customer', '+973 3900 9999', 'phase9-customer@example.test',
    '', '{}'::jsonb, 'f9600000-0000-4000-8000-000000000001', repeat('9', 64)
  ) ->> 'status',
  'booked',
  'a pending public booking is created'
);

reset role;
update public.appointments
set public_reference_token = '11112222-3333-4444-8555-666677778888'
where organization_id = 'f9200000-0000-4000-8000-000000000001';

select is(
  (select public_access_code_hash from public.appointments
   where organization_id = 'f9200000-0000-4000-8000-000000000001'),
  booking_private.hash_access_code('1111-2222-3333'),
  'the trigger stores the access-code hash'
);
select isnt(
  (select public_access_code_hash from public.appointments
   where organization_id = 'f9200000-0000-4000-8000-000000000001'),
  '1111-2222-3333',
  'the plaintext access code is not stored'
);
select is(
  length((select public_access_code_hash from public.appointments
          where organization_id = 'f9200000-0000-4000-8000-000000000001')),
  64,
  'the stored SHA-256 hash has 64 hexadecimal characters'
);
select is(
  public.get_public_booking_confirmation(
    'self-service-a', '11112222-3333-4444-8555-666677778888'
  ) ->> 'accessCode',
  '1111-2222-3333',
  'the confirmation displays the deterministic random-token code'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select ok(
  (public.authenticate_customer_bookings(
    'self-service-a', '+973 3900 9999', '1111-2222-3333', repeat('a', 64)
  ) ->> 'ok')::boolean,
  'phone plus a valid code authenticates the customer'
);
select is(
  public.authenticate_customer_bookings(
    'self-service-a', '+973 3900 9999', 'ffff-ffff-ffff', repeat('b', 64)
  ) ->> 'error',
  'ACCESS_INVALID',
  'an invalid code returns the generic access error'
);
select is(
  public.authenticate_customer_bookings(
    'self-service-b', '+973 3900 9999', '1111-2222-3333', repeat('c', 64)
  ) ->> 'error',
  'ACCESS_INVALID',
  'a code cannot cross organization slugs'
);
select ok(
  (public.authenticate_customer_booking_link(
    'self-service-a', '11112222-3333-4444-8555-666677778888', repeat('d', 64)
  ) ->> 'ok')::boolean,
  'an opaque confirmation link can authenticate the customer'
);

select ok(
  jsonb_array_length(public.get_customer_bookings(
    'f9200000-0000-4000-8000-000000000001',
    (select id from public.customers where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    'upcoming', null, null, 20
  ) -> 'items') = 1,
  'the customer sees the tenant appointment'
);
select ok(
  not (public.get_customer_bookings(
    'f9200000-0000-4000-8000-000000000001',
    (select id from public.customers where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    'upcoming', null, null, 20
  ) -> 'items' -> 0 ? 'customerEmail'),
  'the reduced booking response excludes contact details'
);
select is(
  jsonb_array_length(public.get_customer_bookings(
    'f9200000-0000-4000-8000-000000000002',
    (select id from public.customers where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    'upcoming', null, null, 20
  ) -> 'items'),
  0,
  'customer booking reads cannot cross tenants'
);

select ok(
  (public.request_customer_reschedule(
    'f9200000-0000-4000-8000-000000000001',
    (select id from public.customers where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    (select id from public.appointments where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    'phase9-owner',
    ((((now() at time zone 'Asia/Bahrain')::date + 4) + time '10:00') at time zone 'Asia/Bahrain'),
    'f9700000-0000-4000-8000-000000000001', repeat('e', 64)
  ) ->> 'ok')::boolean,
  'a customer can propose another available slot'
);
select is(
  (select count(*)::integer from public.appointment_reschedule_requests
   where organization_id = 'f9200000-0000-4000-8000-000000000001'
     and status = 'pending'),
  1,
  'only one pending proposal exists'
);
select ok(
  (public.request_customer_reschedule(
    'f9200000-0000-4000-8000-000000000001',
    (select id from public.customers where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    (select id from public.appointments where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    'phase9-owner',
    ((((now() at time zone 'Asia/Bahrain')::date + 4) + time '10:00') at time zone 'Asia/Bahrain'),
    'f9700000-0000-4000-8000-000000000001', repeat('f', 64)
  ) ->> 'ok')::boolean,
  'a repeated submission is idempotent'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f9100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.get_pending_booking_counts() ->> 'reschedules',
  '1',
  'authorized staff see the pending reschedule count'
);
select is(
  (public.decide_reschedule_request(
    (select id from public.appointment_reschedule_requests
     where organization_id = 'f9200000-0000-4000-8000-000000000001'
       and status = 'pending'),
    'approve', ''
  )).status::text,
  'approved',
  'authorized staff can approve a valid proposal'
);
select is(
  (select status::text from public.appointments
   where organization_id = 'f9200000-0000-4000-8000-000000000001'),
  'confirmed',
  'reschedule approval confirms and moves the appointment'
);

reset role;
update public.appointments
set advance_paid_bhd = 5.000
where organization_id = 'f9200000-0000-4000-8000-000000000001';
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select ok(
  (public.cancel_customer_appointment(
    'f9200000-0000-4000-8000-000000000001',
    (select id from public.customers where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    (select id from public.appointments where organization_id = 'f9200000-0000-4000-8000-000000000001'),
    repeat('1', 64)
  ) ->> 'ok')::boolean,
  'an eligible customer cancellation succeeds immediately'
);
select is(
  (select status::text from public.appointments
   where organization_id = 'f9200000-0000-4000-8000-000000000001'),
  'cancelled',
  'customer cancellation releases the slot through cancelled status'
);
select ok(
  (select refund_review_required from public.appointments
   where organization_id = 'f9200000-0000-4000-8000-000000000001'),
  'a cancelled paid appointment is persistently flagged for manual refund review'
);
select is(
  (select source from public.appointment_status_history
   where appointment_id = (
     select id from public.appointments
     where organization_id = 'f9200000-0000-4000-8000-000000000001'
   )
   order by changed_at desc limit 1),
  'customer',
  'customer cancellation is persistently attributed'
);

select * from finish();
rollback;
