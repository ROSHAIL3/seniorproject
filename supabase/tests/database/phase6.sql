begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(32);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'c1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name)
values
  ('c1000000-0000-4000-8000-000000000001', 'phase6-owner@example.test', 'Finance Owner'),
  ('c1000000-0000-4000-8000-000000000002', 'phase6-other@example.test', 'Other Owner');

insert into public.organizations (id, name, slug, created_by)
values
  ('c2000000-0000-4000-8000-000000000001', 'Finance A', 'finance-a', 'c1000000-0000-4000-8000-000000000001'),
  ('c2000000-0000-4000-8000-000000000002', 'Finance B', 'finance-b', 'c1000000-0000-4000-8000-000000000002');

insert into public.branches (id, organization_id, name, code, is_main)
values
  ('c3000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('c3000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by, primary_branch_id
)
values
  ('c4000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'finance-owner', 'owner', 'active', 'c1000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001'),
  ('c4000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'other-owner', 'owner', 'active', 'c1000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000002');

select ok((select relrowsecurity from pg_class where oid = 'public.organization_finance_settings'::regclass), 'finance settings use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_field_definitions'::regclass), 'customer fields use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_field_options'::regclass), 'customer field options use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.service_booking_field_definitions'::regclass), 'service fields use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.service_booking_field_options'::regclass), 'service field options use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.organization_finance_counters'::regclass), 'finance counters use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.invoices'::regclass), 'invoices use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.invoice_items'::regclass), 'invoice items use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.payment_transactions'::regclass), 'payment transactions use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.payment_allocations'::regclass), 'payment allocations use RLS');
select is((select count(*)::integer from public.organization_finance_settings where organization_id in ('c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002')), 2, 'new organizations receive finance settings');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$ select public.replace_customer_field_definitions(
    '[{"id":"field-contact","label":"Preferred contact","type":"dropdown","required":true,"sort_order":0,"options":[{"id":"option-phone","label":"Phone","sort_order":0},{"id":"option-email","label":"Email","sort_order":1}]}]'::jsonb
  ) $$,
  'customer field definitions are persisted'
);
select lives_ok(
  $$ select public.upsert_service_category(null, 'Finance Hair', 'active') $$,
  'owner can create a finance test category'
);
select lives_ok(
  $$
    select public.upsert_catalog_service(
      null, 'Finance Cut', (select id from public.service_categories where name = 'Finance Hair'),
      '', 45, 18.000, true, true, array['finance-owner'],
      array['c3000000-0000-4000-8000-000000000001'::uuid]
    )
  $$,
  'owner can create an invoiced service'
);
select lives_ok(
  $$ select public.replace_service_booking_fields(
    (select id from public.services where name = 'Finance Cut'),
    '[{"id":"field-length","label":"Hair length","type":"dropdown","required":true,"sort_order":0,"options":[{"id":"option-short","label":"Short","sort_order":0},{"id":"option-long","label":"Long","sort_order":1}]}]'::jsonb
  ) $$,
  'service booking fields are persisted'
);
select lives_ok(
  $$ select public.upsert_customer(
    null, 'Phase Six Customer', '+973 3999 0000', 'finance-customer@example.test',
    '', 'active', '{"field-contact":"option-phone"}'::jsonb
  ) $$,
  'customer values matching active definitions are accepted'
);
select throws_ok(
  $$ select public.upsert_customer(
    null, 'Invalid Field Customer', '+973 3999 0001', '',
    '', 'active', '{"field-contact":"unknown-option"}'::jsonb
  ) $$,
  'P0001', 'CUSTOMER_FIELD_OPTION:field-contact', 'invalid customer dropdown answers are rejected'
);
select lives_ok(
  $$
    select public.upsert_appointment(
      null,
      (select id from public.customers where name = 'Phase Six Customer'),
      'finance-owner', 'c3000000-0000-4000-8000-000000000001',
      (select id from public.services where name = 'Finance Cut'),
      '2030-02-04 09:00:00+03', '2030-02-04 09:45:00+03',
      'completed', '', '{"field-length":"option-short"}'::jsonb, 'Finance Owner'
    )
  $$,
  'appointment answers matching service definitions are accepted'
);
select lives_ok(
  $$ select public.update_finance_settings(true, 'exclusive', 10.000, 'VAT-TEST') $$,
  'VAT settings are persisted through the protected function'
);
select lives_ok(
  $$
    select public.create_invoice_from_appointments(
      array[(select id from public.appointments where customer_name = 'Phase Six Customer')],
      '2030-02-04', 'Finance Owner'
    )
  $$,
  'an invoice is created from an appointment transactionally'
);
select is((select invoice_number from public.invoices), 'INV-000001', 'invoice numbering starts at one');
select is((select subtotal_bhd from public.invoices), 18.000::numeric, 'invoice subtotal is snapshotted');
select is((select vat_bhd from public.invoices), 1.800::numeric, 'exclusive VAT is calculated');
select is((select total_bhd from public.invoices), 19.800::numeric, 'invoice total includes VAT');
select throws_ok(
  $$
    select public.create_invoice_from_appointments(
      array[(select id from public.appointments where customer_name = 'Phase Six Customer')],
      '2030-02-04', 'Finance Owner'
    )
  $$,
  'P0001', 'APPOINTMENT_ALREADY_INVOICED', 'an appointment cannot be invoiced twice'
);
select lives_ok(
  $$
    select public.record_invoice_payment(
      (select id from public.invoices), 'payment', 'cash', 5.000,
      'Deposit', 'phase6-payment-001', 'Finance Owner'
    )
  $$,
  'invoice payment is append-only and allocated'
);
select is(
  (select sum(case when kind = 'payment' then amount_bhd else -amount_bhd end) from public.payment_transactions),
  5.000::numeric,
  'net paid amount reflects the payment'
);
select throws_ok(
  $$
    select public.record_invoice_payment(
      (select id from public.invoices), 'payment', 'cash', 20.000,
      '', 'phase6-payment-002', 'Finance Owner'
    )
  $$,
  'P0001', 'PAYMENT_EXCEEDS_BALANCE', 'overpayment is rejected'
);
select lives_ok(
  $$
    select public.record_invoice_payment(
      (select id from public.invoices), 'refund', 'cash', 2.000,
      'Partial refund', 'phase6-refund-001', 'Finance Owner'
    )
  $$,
  'a valid refund is appended'
);
select is(
  (select sum(case when kind = 'payment' then amount_bhd else -amount_bhd end) from public.payment_transactions),
  3.000::numeric,
  'net paid amount reflects the refund'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.invoices), 0, 'another organization cannot view invoices');
select is((select count(*)::integer from public.payment_transactions), 0, 'another organization cannot view payments');

select * from finish();
rollback;
