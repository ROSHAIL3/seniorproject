begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(23);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'd1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name)
values
  ('d1000000-0000-4000-8000-000000000001', 'phase7-owner@example.test', 'Expense Owner'),
  ('d1000000-0000-4000-8000-000000000002', 'phase7-other@example.test', 'Other Owner');

insert into public.organizations (id, name, slug, created_by)
values
  ('d2000000-0000-4000-8000-000000000001', 'Expense A', 'expense-a', 'd1000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000002', 'Expense B', 'expense-b', 'd1000000-0000-4000-8000-000000000002');

insert into public.branches (id, organization_id, name, code, is_main)
values
  ('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by, primary_branch_id
)
values
  ('d4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'expense-owner', 'owner', 'active', 'd1000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001'),
  ('d4000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'other-owner', 'owner', 'active', 'd1000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000002');

select ok((select relrowsecurity from pg_class where oid = 'public.expense_categories'::regclass), 'expense categories use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.expenses'::regclass), 'expenses use RLS');
select ok(has_table_privilege('authenticated', 'public.expense_categories', 'SELECT'), 'authenticated can select expense categories');
select ok(has_table_privilege('authenticated', 'public.expenses', 'SELECT'), 'authenticated can select expenses');
select ok(not has_table_privilege('authenticated', 'public.expense_categories', 'INSERT'), 'expense categories cannot be inserted directly');
select ok(not has_table_privilege('authenticated', 'public.expenses', 'INSERT'), 'expenses cannot be inserted directly');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$ select public.upsert_expense_category(null, 'Supplies', '#465FFF') $$,
  'owner can create an expense category'
);
select throws_ok(
  $$ select public.upsert_expense_category(null, ' supplies ', '#12B76A') $$,
  'P0001', 'EXPENSE_CATEGORY_DUPLICATE', 'category names are unique per organization'
);
select lives_ok(
  $$
    select public.upsert_expense(
      null,
      (select id from public.expense_categories where name = 'Supplies'),
      'd3000000-0000-4000-8000-000000000001',
      'Phase seven supplies', 54.000, 4.909, 'vat_included',
      '2030-03-01', 'card', 'PO-001', 'Database test',
      'phase7-submission-001'
    )
  $$,
  'owner can create an expense'
);
select lives_ok(
  $$
    select public.upsert_expense(
      null,
      (select id from public.expense_categories where name = 'Supplies'),
      'd3000000-0000-4000-8000-000000000001',
      'Phase seven supplies', 54.000, 4.909, 'vat_included',
      '2030-03-01', 'card', 'PO-001', 'Database test',
      'phase7-submission-001'
    )
  $$,
  'repeated submission is idempotent'
);
select is((select count(*)::integer from public.expenses), 1, 'idempotency prevents duplicate expenses');
select is((select amount_bhd from public.expenses), 54.000::numeric, 'BHD amount keeps three-decimal precision');
select is((select input_vat_bhd from public.expenses), 4.909::numeric, 'input VAT keeps three-decimal precision');
select throws_ok(
  $$
    select public.upsert_expense(
      null,
      (select id from public.expense_categories where name = 'Supplies'),
      'd3000000-0000-4000-8000-000000000001',
      'Invalid VAT', 10.000, 1.000, 'no_vat',
      '2030-03-02', 'cash', '', '', 'phase7-submission-002'
    )
  $$,
  'P0001', 'EXPENSE_INVALID', 'no-VAT expenses cannot record input VAT'
);
select throws_ok(
  $$
    select public.upsert_expense(
      null,
      (select id from public.expense_categories where name = 'Supplies'),
      'd3000000-0000-4000-8000-000000000002',
      'Wrong tenant branch', 10.000, 0.000, 'no_vat',
      '2030-03-02', 'cash', '', '', 'phase7-submission-003'
    )
  $$,
  'P0001', 'EXPENSE_BRANCH_INVALID', 'an expense cannot reference another organization branch'
);
select lives_ok(
  $$
    select public.upsert_expense(
      (select id from public.expenses),
      (select id from public.expense_categories where name = 'Supplies'),
      'd3000000-0000-4000-8000-000000000001',
      'Updated supplies', 60.000, 5.455, 'vat_included',
      '2030-03-01', 'bank_transfer', 'PO-001', 'Updated',
      null
    )
  $$,
  'owner can update an expense'
);
select is((select amount_bhd from public.expenses), 60.000::numeric, 'updated amount is persisted');
select lives_ok(
  $$ select public.delete_expense((select id from public.expenses)) $$,
  'expense deletion is soft and permission protected'
);
select is((select count(*)::integer from public.expenses), 0, 'soft-deleted expenses are hidden by RLS');
select lives_ok(
  $$ select public.remove_expense_category((select id from public.expense_categories where name = 'Supplies')) $$,
  'used expense category can be removed safely'
);
select is((select status::text from public.expense_categories where name = 'Supplies'), 'archived', 'used category is archived instead of deleted');

select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.expense_categories), 0, 'another organization cannot view expense categories');
select is((select count(*)::integer from public.expenses), 0, 'another organization cannot view expenses');

select * from finish();
rollback;
