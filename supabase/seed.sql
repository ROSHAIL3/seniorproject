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
    business_email,
    business_phone,
    address,
    website,
    public_booking_enabled,
    created_by
  )
  values (
    demo_organization_id,
    'Slotova Demo',
    'slotova-demo-local',
    'BH',
    'BHD',
    'Asia/Bahrain',
    'owner@slotova.local',
    '+973 3876 4976',
    'Manama, Bahrain',
    'https://slotova.local',
    true,
    demo_user_id
  )
  on conflict (id) do nothing;

  insert into public.organization_members (
    organization_id,
    user_id,
    staff_key,
    role,
    status,
    created_by,
    accepted_at
  )
  values (
    demo_organization_id,
    demo_user_id,
    'staff-demo-owner',
    'owner',
    'active',
    demo_user_id,
    now()
  )
  on conflict (organization_id, user_id) do nothing;

  insert into public.branches (
    id,
    organization_id,
    name,
    code,
    phone,
    email,
    address,
    google_maps_url,
    time_zone,
    status,
    is_main
  )
  values (
    '30000000-0000-0000-0000-000000000001',
    demo_organization_id,
    'Main Branch',
    'MAIN',
    '+973 3876 4976',
    'owner@slotova.local',
    'Manama, Bahrain',
    'https://maps.google.com/?q=Manama+Bahrain',
    'Asia/Bahrain',
    'active',
    true
  )
  on conflict (id) do nothing;

  update public.organization_members
  set primary_branch_id = '30000000-0000-0000-0000-000000000001'
  where organization_id = demo_organization_id
    and user_id = demo_user_id;

  insert into public.staff_schedules (
    organization_id,
    membership_id,
    use_custom_hours,
    days
  )
  select
    demo_organization_id,
    membership.id,
    false,
    '[]'::jsonb
  from public.organization_members membership
  where membership.organization_id = demo_organization_id
    and membership.user_id = demo_user_id
  on conflict (organization_id, membership_id) do nothing;

  insert into public.service_categories (id, organization_id, name, status)
  values
    ('41000000-0000-0000-0000-000000000001', demo_organization_id, 'Hair - Cut & Style', 'active'),
    ('41000000-0000-0000-0000-000000000002', demo_organization_id, 'Hair - Color & Treatment', 'active'),
    ('41000000-0000-0000-0000-000000000003', demo_organization_id, 'Massage & Body', 'active'),
    ('41000000-0000-0000-0000-000000000004', demo_organization_id, 'Nails', 'active')
  on conflict (id) do nothing;

  insert into public.services (
    id, organization_id, category_id, name, description, duration_minutes,
    price_bhd, is_active, vat_applicable
  )
  values
    ('service-haircut', demo_organization_id, '41000000-0000-0000-0000-000000000001', 'Women''s Haircut', 'Consultation, wash, cut and finish.', 45, 18.000, true, true),
    ('service-color', demo_organization_id, '41000000-0000-0000-0000-000000000002', 'Hair Color & Treatment', 'Professional color application and conditioning treatment.', 90, 42.500, true, true),
    ('service-massage', demo_organization_id, '41000000-0000-0000-0000-000000000003', 'Deep Tissue Massage', 'Focused massage for muscular tension and recovery.', 60, 30.000, true, true),
    ('service-manicure', demo_organization_id, '41000000-0000-0000-0000-000000000004', 'Classic Manicure', 'Nail shaping, cuticle care and classic polish.', 45, 15.000, true, true)
  on conflict (id) do nothing;

  insert into public.service_branches (organization_id, service_id, branch_id)
  select demo_organization_id, service.id, '30000000-0000-0000-0000-000000000001'
  from public.services service
  where service.organization_id = demo_organization_id
  on conflict do nothing;

  insert into public.service_staff (organization_id, service_id, membership_id)
  select demo_organization_id, 'service-haircut', membership.id
  from public.organization_members membership
  where membership.organization_id = demo_organization_id
    and membership.user_id = demo_user_id
  on conflict do nothing;
end;
$$;
