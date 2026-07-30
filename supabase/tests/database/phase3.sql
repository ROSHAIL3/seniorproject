begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'phase3-owner@example.test', 'not-used',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'phase3-invite@example.test', 'not-used',
    null, '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'phase3-other@example.test', 'not-used',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (user_id, email, full_name)
values
  ('91000000-0000-4000-8000-000000000001', 'phase3-owner@example.test', 'Phase 3 Owner'),
  ('91000000-0000-4000-8000-000000000003', 'phase3-other@example.test', 'Other Owner')
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name;

insert into public.organizations (id, name, slug, created_by)
values
  (
    '92000000-0000-4000-8000-000000000001',
    'Phase 3 Organization',
    'phase-3-organization',
    '91000000-0000-4000-8000-000000000001'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    'Other Organization',
    'phase-3-other',
    '91000000-0000-4000-8000-000000000003'
  );

insert into public.branches (id, organization_id, name, code, is_main)
values
  (
    '93000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'Main',
    'MAIN',
    true
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000002',
    'Other Main',
    'MAIN',
    true
  );

insert into public.organization_members (
  id, organization_id, user_id, staff_key, role, status, created_by,
  primary_branch_id, accepted_at
)
values
  (
    '94000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'phase3-owner',
    'owner',
    'active',
    '91000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000001',
    now()
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000003',
    'phase3-other-owner',
    'owner',
    'active',
    '91000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000002',
    now()
  );

select ok(
  (select relrowsecurity from pg_class where oid = 'public.staff_schedules'::regclass),
  'staff schedules have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.staff_time_off'::regclass),
  'staff time off has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.activity_logs'::regclass),
  'activity logs have RLS enabled'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_team_membership(uuid,text,text,text,public.organization_role,uuid,text[],jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot create team memberships'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    select public.create_team_membership(
      '91000000-0000-4000-8000-000000000002',
      'Invited Staff',
      'phase3-invite@example.test',
      '+973 3000 0000',
      'staff',
      '93000000-0000-4000-8000-000000000001',
      array['service-haircut'],
      '{"Appointments":{"view":true}}'::jsonb
    )
  $$,
  'an owner can create a tenant-scoped invitation membership'
);
select is(
  (
    select status::text
    from public.organization_members
    where user_id = '91000000-0000-4000-8000-000000000002'
  ),
  'invited',
  'new team memberships remain invited until acceptance'
);
select is(
  (select count(*)::integer from public.organization_members),
  2,
  'RLS hides the other organization membership'
);
select ok(
  public.has_module_permission('Appointments', 'view'),
  'owners always pass module permission checks'
);
select ok(
  (select count(*) > 0 from public.activity_logs),
  'database triggers persist tenant activity'
);
select is(
  (
    select count(*)::integer
    from public.activity_logs
    where organization_id = '92000000-0000-4000-8000-000000000002'
  ),
  0,
  'activity logs from another organization remain hidden'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select ok(
  not public.can_access_application(),
  'an invited member cannot access the application before acceptance'
);
select is(
  public.complete_account_onboarding('Invited Staff'),
  '92000000-0000-4000-8000-000000000001'::uuid,
  'accepting an invitation completes onboarding in the existing organization'
);
select ok(
  public.can_access_application(),
  'an accepted member can access the application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$ select public.disable_team_membership(
    (
      select staff_key
      from public.organization_members
      where user_id = '91000000-0000-4000-8000-000000000002'
    )
  ) $$,
  'an owner can disable a non-owner membership'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select ok(
  not public.can_access_application(),
  'a disabled member is blocked from the application'
);

select * from finish();
rollback;
