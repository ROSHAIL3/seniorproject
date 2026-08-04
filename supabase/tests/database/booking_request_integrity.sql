begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'fa100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'integrity-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fa100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'integrity-staff@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name) values
  ('fa100000-0000-4000-8000-000000000001', 'integrity-owner@example.test', 'Integrity Owner'),
  ('fa100000-0000-4000-8000-000000000002', 'integrity-staff@example.test', 'Integrity Staff');

insert into public.organizations (
  id, name, slug, public_booking_enabled, booking_auto_confirm, created_by
) values (
  'fa200000-0000-4000-8000-000000000001',
  'Booking Integrity', 'booking-integrity', true, true,
  'fa100000-0000-4000-8000-000000000001'
);

insert into public.branches (id, organization_id, name, code, is_main)
values (
  'fa300000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000001', 'Main', 'MAIN', true
);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by,
  primary_branch_id
) values
  ('fa400000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001', 'fa100000-0000-4000-8000-000000000001', 'integrity-owner', 'owner', 'active', 'fa100000-0000-4000-8000-000000000001', 'fa300000-0000-4000-8000-000000000001'),
  ('fa400000-0000-4000-8000-000000000002', 'fa200000-0000-4000-8000-000000000001', 'fa100000-0000-4000-8000-000000000002', 'integrity-staff', 'member', 'active', 'fa100000-0000-4000-8000-000000000001', 'fa300000-0000-4000-8000-000000000001');

insert into public.service_categories (id, organization_id, name)
values ('fa500000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001', 'Test');

insert into public.services (
  id, organization_id, category_id, name, duration_minutes, price_bhd
) values (
  'integrity-service', 'fa200000-0000-4000-8000-000000000001',
  'fa500000-0000-4000-8000-000000000001', 'Integrity Service', 60, 10
);

insert into public.customers (
  id, organization_id, name, phone, normalized_phone, status
) values
  ('fa600000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001', 'Customer One', '+97339000001', '+97339000001', 'active'),
  ('fa600000-0000-4000-8000-000000000002', 'fa200000-0000-4000-8000-000000000001', 'Customer Two', '+97339000002', '+97339000002', 'active');

insert into public.customer_field_definitions (
  id, organization_id, label, type, required, sort_order
) values (
  'integrity-customer-country',
  'fa200000-0000-4000-8000-000000000001',
  'Country', 'text', true, 0
);

select is(
  public.get_public_booking_page('booking-integrity')
    -> 'customerFields' -> 0 ->> 'id',
  'integrity-customer-country',
  'public booking page returns active customer field definitions'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_public_booking(text,uuid,text,text,timestamptz,text,text,text,text,jsonb,jsonb,uuid,text)',
    'EXECUTE'
  ),
  'server role can execute the customer-field booking request overload'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_public_booking(text,uuid,text,text,timestamptz,text,text,text,text,jsonb,jsonb,uuid,text)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the booking mutation directly'
);

select ok(
  exists(select 1 from pg_constraint where conname = 'appointments_no_staff_overlap'),
  'database constraint protects staff from overlapping active appointments'
);
select ok(
  exists(select 1 from pg_constraint where conname = 'appointments_no_customer_overlap'),
  'database constraint protects customers from overlapping active appointments'
);
select ok(
  exists(select 1 from pg_trigger where tgname = 'appointments_force_public_booking_request' and not tgisinternal),
  'public booking request trigger is installed'
);

insert into public.appointments (
  organization_id, booking_number, customer_id, membership_id, branch_id,
  offering_type, service_id, starts_at, ends_at, customer_name,
  customer_phone, staff_name, offering_name, price_bhd, status,
  created_by_name
) values (
  'fa200000-0000-4000-8000-000000000001', 'BK-I00001',
  'fa600000-0000-4000-8000-000000000001',
  'fa400000-0000-4000-8000-000000000001',
  'fa300000-0000-4000-8000-000000000001', 'service',
  'integrity-service', now() + interval '2 days',
  now() + interval '2 days 1 hour', 'Customer One', '+97339000001',
  'Integrity Owner', 'Integrity Service', 10, 'booked', 'Test'
);

create temporary table booking_integrity_results (
  scenario text primary key,
  protected boolean not null
);

do $$
begin
  begin
    insert into public.appointments (
      organization_id, booking_number, customer_id, membership_id, branch_id,
      offering_type, service_id, starts_at, ends_at, customer_name,
      customer_phone, staff_name, offering_name, price_bhd, status,
      created_by_name
    ) values (
      'fa200000-0000-4000-8000-000000000001', 'BK-I00002',
      'fa600000-0000-4000-8000-000000000002',
      'fa400000-0000-4000-8000-000000000001',
      'fa300000-0000-4000-8000-000000000001', 'service',
      'integrity-service', now() + interval '2 days 30 minutes',
      now() + interval '2 days 1 hour 30 minutes', 'Customer Two',
      '+97339000002', 'Integrity Owner', 'Integrity Service', 10,
      'confirmed', 'Test'
    );
    insert into booking_integrity_results values ('staff_overlap', false);
  exception when exclusion_violation then
    insert into booking_integrity_results values ('staff_overlap', true);
  end;

  begin
    insert into public.appointments (
      organization_id, booking_number, customer_id, membership_id, branch_id,
      offering_type, service_id, starts_at, ends_at, customer_name,
      customer_phone, staff_name, offering_name, price_bhd, status,
      created_by_name
    ) values (
      'fa200000-0000-4000-8000-000000000001', 'BK-I00003',
      'fa600000-0000-4000-8000-000000000001',
      'fa400000-0000-4000-8000-000000000002',
      'fa300000-0000-4000-8000-000000000001', 'service',
      'integrity-service', now() + interval '2 days 30 minutes',
      now() + interval '2 days 1 hour 30 minutes', 'Customer One',
      '+97339000001', 'Integrity Staff', 'Integrity Service', 10,
      'confirmed', 'Test'
    );
    insert into booking_integrity_results values ('customer_overlap', false);
  exception when exclusion_violation then
    insert into booking_integrity_results values ('customer_overlap', true);
  end;
end;
$$;

select ok(
  (select protected from booking_integrity_results where scenario = 'staff_overlap'),
  'simultaneous staff overlap is rejected'
);
select ok(
  (select protected from booking_integrity_results where scenario = 'customer_overlap'),
  'simultaneous customer overlap is rejected'
);

insert into public.appointments (
  organization_id, booking_number, customer_id, membership_id, branch_id,
  offering_type, service_id, starts_at, ends_at, customer_name,
  customer_phone, staff_name, offering_name, price_bhd, status,
  created_by_name
) values (
  'fa200000-0000-4000-8000-000000000001', 'BK-I00004',
  'fa600000-0000-4000-8000-000000000001',
  'fa400000-0000-4000-8000-000000000001',
  'fa300000-0000-4000-8000-000000000001', 'service',
  'integrity-service', now() + interval '2 days 1 hour',
  now() + interval '2 days 2 hours', 'Customer One', '+97339000001',
  'Integrity Owner', 'Integrity Service', 10, 'confirmed', 'Test'
);
select pass('back-to-back appointments that only touch at the boundary are allowed');

insert into public.appointments (
  organization_id, booking_number, customer_id, membership_id, branch_id,
  offering_type, service_id, starts_at, ends_at, customer_name,
  customer_phone, staff_name, offering_name, price_bhd, status,
  created_by_name
) values (
  'fa200000-0000-4000-8000-000000000001', 'BK-I00006',
  'fa600000-0000-4000-8000-000000000001',
  'fa400000-0000-4000-8000-000000000001',
  'fa300000-0000-4000-8000-000000000001', 'service',
  'integrity-service', now() + interval '2 days 15 minutes',
  now() + interval '2 days 45 minutes', 'Customer One', '+97339000001',
  'Integrity Owner', 'Integrity Service', 10, 'cancelled', 'Test'
);
select pass('cancelled appointments release their time range for reuse');

insert into public.appointments (
  organization_id, booking_number, customer_id, membership_id, branch_id,
  offering_type, service_id, starts_at, ends_at, customer_name,
  customer_phone, staff_name, offering_name, price_bhd, status,
  created_by_name, booking_source, public_submission_id,
  public_reference_token
) values (
  'fa200000-0000-4000-8000-000000000001', 'BK-I00005',
  'fa600000-0000-4000-8000-000000000002',
  'fa400000-0000-4000-8000-000000000002',
  'fa300000-0000-4000-8000-000000000001', 'service',
  'integrity-service', now() + interval '4 days',
  now() + interval '4 days 1 hour', 'Customer Two', '+97339000002',
  'Integrity Staff', 'Integrity Service', 10, 'confirmed', 'Test', 'public',
  'fa700000-0000-4000-8000-000000000001',
  'fa800000-0000-4000-8000-000000000001'
);
select is(
  (select status from public.appointments where booking_number = 'BK-I00005'),
  'booked'::public.appointment_status,
  'public appointments always start as pending requests even when auto-confirm is enabled'
);

select * from finish();
rollback;
