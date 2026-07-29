begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

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
    '40000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner-a@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Owner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Owner B"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values
  (
    '50000000-0000-0000-0000-000000000001',
    'Organization A',
    'organization-a-test',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'Organization B',
    'organization-b-test',
    '40000000-0000-0000-0000-000000000002'
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
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'owner',
    'active',
    '40000000-0000-0000-0000-000000000002'
  );

insert into public.branches (organization_id, name, code, is_main)
values
  (
    '50000000-0000-0000-0000-000000000001',
    'Branch A',
    'MAIN',
    true
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'Branch B',
    'MAIN',
    true
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organizations),
  1,
  'an owner sees only their organization'
);
select is(
  (select min(name) from public.organizations),
  'Organization A',
  'the visible organization is the owner organization'
);
select is(
  (select count(*)::integer from public.branches),
  1,
  'an owner sees only branches in their organization'
);
select is(
  (select count(*)::integer from public.organization_members),
  1,
  'an owner sees only memberships in their organization'
);
select is(
  (select count(*)::integer from public.profiles),
  1,
  'a user sees only their own profile'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is(
  (select min(name) from public.organizations),
  'Organization B',
  'changing the authenticated user changes the tenant boundary'
);

select * from finish();
rollback;
