-- Local development only. This file is run by `supabase db reset`; do not run
-- it against a hosted project.
do $$
declare
  demo_user_id constant uuid := '10000000-0000-0000-0000-000000000001';
  demo_organization_id constant uuid := '20000000-0000-0000-0000-000000000001';
begin
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
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    demo_user_id,
    'authenticated',
    'authenticated',
    'owner@slotova.local',
    extensions.crypt('SlotovaDemo123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Demo","last_name":"Owner","full_name":"Demo Owner"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    demo_user_id,
    demo_user_id,
    'owner@slotova.local',
    jsonb_build_object(
      'sub',
      demo_user_id::text,
      'email',
      'owner@slotova.local',
      'email_verified',
      true
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  insert into public.organizations (
    id,
    name,
    slug,
    country_code,
    currency_code,
    time_zone,
    created_by
  )
  values (
    demo_organization_id,
    'Slotova Demo',
    'slotova-demo-local',
    'BH',
    'BHD',
    'Asia/Bahrain',
    demo_user_id
  )
  on conflict (id) do nothing;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    created_by
  )
  values (
    demo_organization_id,
    demo_user_id,
    'owner',
    'active',
    demo_user_id
  )
  on conflict (organization_id, user_id) do nothing;

  insert into public.branches (
    id,
    organization_id,
    name,
    code,
    time_zone,
    status,
    is_main
  )
  values (
    '30000000-0000-0000-0000-000000000001',
    demo_organization_id,
    'Main Branch',
    'MAIN',
    'Asia/Bahrain',
    'active',
    true
  )
  on conflict (id) do nothing;
end;
$$;
