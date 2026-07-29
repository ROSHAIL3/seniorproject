begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phase2-owner-a@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'phase2-owner-b@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'phase2-staff@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (
  id,
  name,
  slug,
  business_email,
  created_by
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'Phase 2 Organization A',
    'phase-2-organization-a',
    'phase2-owner-a@example.test',
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    'Phase 2 Organization B',
    'phase-2-organization-b',
    'phase2-owner-b@example.test',
    '60000000-0000-4000-8000-000000000002'
  );

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  created_by
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    'owner',
    'active',
    '60000000-0000-4000-8000-000000000002'
  ),
  (
    '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000003',
    'staff',
    'active',
    '60000000-0000-4000-8000-000000000001'
  );

insert into public.branches (
  id,
  organization_id,
  name,
  code,
  status,
  is_main
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'Main A',
    'MAIN',
    'active',
    true
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    'Main B',
    'MAIN',
    'active',
    true
  );

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'organization % logos'
  ),
  4,
  'organization logos have read, insert, update, and delete policies'
);

select is(
  (
    select file_size_limit::bigint
    from storage.buckets
    where id = 'organization-logos'
  ),
  2097152::bigint,
  'the organization logo bucket has a two megabyte limit'
);

select ok(
  not (
    select public
    from storage.buckets
    where id = 'organization-logos'
  ),
  'the organization logo bucket is private'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    select public.upsert_branch(
      null,
      'Second A',
      '+973 3000 0000',
      'second-a@example.test',
      'Manama',
      '',
      'Asia/Bahrain',
      'active',
      false
    )
  $$,
  'an owner can create a branch'
);

select is(
  (select count(*)::integer from public.branches),
  2,
  'the owner sees both branches in their own organization'
);

select is(
  (
    select count(*)::integer
    from public.branches
    where organization_id = '70000000-0000-4000-8000-000000000002'
  ),
  0,
  'cross-organization branches remain hidden'
);

select lives_ok(
  $$
    select public.upsert_branch(
      (
        select id
        from public.branches
        where name = 'Second A'
      ),
      'Second A',
      '+973 3000 0000',
      'second-a@example.test',
      'Manama',
      '',
      'Asia/Bahrain',
      'active',
      true
    )
  $$,
  'an owner can atomically change the main branch'
);

select is(
  (
    select name
    from public.branches
    where is_main
  ),
  'Second A',
  'exactly the selected branch becomes main'
);

select throws_ok(
  $$
    select public.delete_branch(
      (
        select id
        from public.branches
        where is_main
      )
    )
  $$,
  'P0001',
  'MAIN_BRANCH_DELETE_FORBIDDEN',
  'the main branch cannot be deleted'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select public.upsert_branch(
      null,
      'Staff Branch',
      '+973 3000 0001',
      'staff-branch@example.test',
      'Manama',
      '',
      'Asia/Bahrain',
      'active',
      false
    )
  $$,
  'P0001',
  'BRANCH_FORBIDDEN',
  'staff cannot create branches'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.soft_delete_organization('Wrong Name') $$,
  'P0001',
  'ORGANIZATION_NAME_MISMATCH',
  'soft deletion requires the exact organization name'
);

select ok(
  public.is_organization_business_email_verified(
    '70000000-0000-4000-8000-000000000001'
  ),
  'the confirmed owner login verifies the matching business email'
);

select is(
  public.soft_delete_organization('Phase 2 Organization A'),
  '70000000-0000-4000-8000-000000000001'::uuid,
  'the owner can soft-delete the organization'
);

select is(
  (select count(*)::integer from public.organizations),
  0,
  'soft-deleted organization data is inaccessible through RLS'
);

select * from finish();
rollback;
