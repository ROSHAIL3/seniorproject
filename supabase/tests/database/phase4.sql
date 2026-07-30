begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(14);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase4-owner@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase4-staff@example.test', 'unused', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'phase4-other@example.test', 'unused', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, email, full_name)
values
  ('a1000000-0000-4000-8000-000000000001', 'phase4-owner@example.test', 'Catalog Owner'),
  ('a1000000-0000-4000-8000-000000000002', 'phase4-staff@example.test', 'Catalog Staff'),
  ('a1000000-0000-4000-8000-000000000003', 'phase4-other@example.test', 'Other Owner')
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name;

insert into public.organizations (id, name, slug, created_by)
values
  ('a2000000-0000-4000-8000-000000000001', 'Catalog A', 'catalog-a', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'Catalog B', 'catalog-b', 'a1000000-0000-4000-8000-000000000003');

insert into public.branches (id, organization_id, name, code, is_main)
values
  ('a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Main A', 'MAIN', true),
  ('a3000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'Main B', 'MAIN', true);

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by, primary_branch_id
)
values
  ('a4000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'catalog-owner', 'owner', 'active', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001'),
  ('a4000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'catalog-staff', 'staff', 'active', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001'),
  ('a4000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'other-owner', 'owner', 'active', 'a1000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000002');

select ok((select relrowsecurity from pg_class where oid = 'public.service_categories'::regclass), 'categories use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.services'::regclass), 'services use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.service_branches'::regclass), 'service branches use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.service_staff'::regclass), 'service staff use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.service_packages'::regclass), 'packages use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.package_items'::regclass), 'package items use RLS');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$ select public.upsert_service_category(null, 'Hair', 'active') $$,
  'owner can create a category'
);
select lives_ok(
  $$
    select public.upsert_catalog_service(
      null, 'Cut', (select id from public.service_categories where name = 'Hair'),
      'Cut and finish', 45, 18.000, true, true,
      array['catalog-staff'], array['a3000000-0000-4000-8000-000000000001'::uuid]
    )
  $$,
  'owner can transactionally create a service'
);
select is((select count(*)::integer from public.service_staff), 1, 'staff assignment is persisted');
select is((select count(*)::integer from public.service_branches), 1, 'branch availability is persisted');
select lives_ok(
  $$
    select public.upsert_service_package(
      null, 'Hair Bundle', '', 'combo', 15.000, true, false,
      jsonb_build_array(jsonb_build_object(
        'service_id', (select id from public.services where name = 'Cut'),
        'quantity', 1, 'sort_order', 0
      ))
    )
  $$,
  'owner can transactionally create a package'
);
select is((select count(*)::integer from public.package_items), 1, 'package item is persisted');

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::integer from public.services), 0, 'another organization cannot view services');

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ select public.upsert_service_category(null, 'Forbidden', 'active') $$,
  'P0001', 'CATALOG_FORBIDDEN', 'staff without permission cannot mutate catalog'
);

select * from finish();
rollback;
