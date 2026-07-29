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

  insert into public.customers (
    id, organization_id, name, phone, normalized_phone, email, notes, created_by
  )
  values (
    '50000000-0000-0000-0000-000000000001',
    demo_organization_id,
    'Demo Customer',
    '+973 3900 0000',
    '+97339000000',
    'customer@slotova.local',
    'Local development seed customer.',
    demo_user_id
  )
  on conflict (id) do nothing;

  insert into public.appointments (
    id, organization_id, booking_number, customer_id, membership_id, branch_id,
    offering_type, service_id, starts_at, ends_at, customer_name,
    customer_phone, customer_email, staff_name, offering_name, price_bhd,
    status, notes, created_by, created_by_name
  )
  select
    '60000000-0000-0000-0000-000000000001',
    demo_organization_id,
    'BK-000001',
    '50000000-0000-0000-0000-000000000001',
    membership.id,
    '30000000-0000-0000-0000-000000000001',
    'service',
    'service-haircut',
    '2026-08-03 09:45:00+03',
    '2026-08-03 10:30:00+03',
    'Demo Customer',
    '+973 3900 0000',
    'customer@slotova.local',
    'Demo Owner',
    'Women''s Haircut',
    18.000,
    'booked',
    'Local development seed appointment.',
    demo_user_id,
    'Demo Owner'
  from public.organization_members membership
  where membership.organization_id = demo_organization_id
    and membership.user_id = demo_user_id
  on conflict (id) do nothing;

  insert into public.organization_booking_counters (organization_id, next_number)
  values (demo_organization_id, 2)
  on conflict (organization_id) do update
    set next_number = greatest(public.organization_booking_counters.next_number, 2);

  insert into public.customer_field_definitions (
    id, organization_id, label, type, required, sort_order
  )
  values (
    'customer-field-contact', demo_organization_id, 'Preferred contact',
    'dropdown', true, 0
  )
  on conflict (id) do nothing;

  insert into public.customer_field_options (
    id, organization_id, field_id, label, sort_order
  )
  values
    ('customer-option-phone', demo_organization_id, 'customer-field-contact', 'Phone', 0),
    ('customer-option-email', demo_organization_id, 'customer-field-contact', 'Email', 1)
  on conflict (id) do nothing;

  update public.customers
  set custom_values = '{"customer-field-contact":"customer-option-phone"}'::jsonb
  where id = '50000000-0000-0000-0000-000000000001';

  insert into public.service_booking_field_definitions (
    id, organization_id, service_id, label, type, required, sort_order
  )
  values (
    'service-field-length', demo_organization_id, 'service-haircut',
    'Hair length', 'dropdown', true, 0
  )
  on conflict (id) do nothing;

  insert into public.service_booking_field_options (
    id, organization_id, field_id, label, sort_order
  )
  values
    ('service-option-short', demo_organization_id, 'service-field-length', 'Short', 0),
    ('service-option-long', demo_organization_id, 'service-field-length', 'Long', 1)
  on conflict (id) do nothing;

  update public.appointments
  set service_field_values = '{"service-field-length":"service-option-short"}'::jsonb,
      advance_paid_bhd = 5.000
  where id = '60000000-0000-0000-0000-000000000001';

  insert into public.invoices (
    id, organization_id, invoice_number, customer_id, customer_name,
    customer_phone, customer_email, issued_on, vat_enabled, vat_type,
    vat_rate_percent, subtotal_bhd, vat_bhd, total_bhd, created_by,
    created_by_name
  )
  values (
    '70000000-0000-0000-0000-000000000001', demo_organization_id,
    'INV-000001', '50000000-0000-0000-0000-000000000001',
    'Demo Customer', '+973 3900 0000', 'customer@slotova.local',
    '2026-08-03', true, 'exclusive', 10.000, 18.000, 1.800, 19.800,
    demo_user_id, 'Demo Owner'
  )
  on conflict (id) do nothing;

  insert into public.invoice_items (
    id, organization_id, invoice_id, appointment_id, service_id, description,
    quantity, unit_price_bhd, vat_applicable, line_subtotal_bhd, line_vat_bhd,
    line_total_bhd
  )
  values (
    '71000000-0000-0000-0000-000000000001', demo_organization_id,
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001', 'service-haircut',
    'Women''s Haircut', 1, 18.000, true, 18.000, 1.800, 19.800
  )
  on conflict (id) do nothing;

  insert into public.payment_transactions (
    id, organization_id, invoice_id, appointment_id, kind, method, amount_bhd,
    note, idempotency_key, recorded_by, recorded_by_name
  )
  values (
    '72000000-0000-0000-0000-000000000001', demo_organization_id,
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001', 'payment', 'cash', 5.000,
    'Local seed advance payment', 'local-seed-payment-001', demo_user_id,
    'Demo Owner'
  )
  on conflict (id) do nothing;

  insert into public.payment_allocations (
    id, organization_id, transaction_id, invoice_item_id, kind, amount_bhd
  )
  values (
    '73000000-0000-0000-0000-000000000001', demo_organization_id,
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001', 'payment', 5.000
  )
  on conflict (id) do nothing;

  insert into public.organization_finance_counters (
    organization_id, next_invoice_number
  )
  values (demo_organization_id, 2)
  on conflict (organization_id) do update
    set next_invoice_number = greatest(
      public.organization_finance_counters.next_invoice_number,
      2
    );

  insert into public.expense_categories (
    id, organization_id, name, color_hex, status, created_by
  )
  values
    ('expense-category-supplies', demo_organization_id, 'Supplies', '#465FFF', 'active', demo_user_id),
    ('expense-category-rent', demo_organization_id, 'Rent & utilities', '#12B76A', 'active', demo_user_id),
    ('expense-category-marketing', demo_organization_id, 'Marketing', '#F79009', 'active', demo_user_id),
    ('expense-category-other', demo_organization_id, 'Other', '#0BA5EC', 'active', demo_user_id)
  on conflict (id) do nothing;

  insert into public.expenses (
    id, organization_id, category_id, branch_id, description, amount_bhd,
    input_vat_bhd, vat_treatment, incurred_on, payment_method,
    reference_number, notes, submission_id, created_by
  )
  values
    (
      '80000000-0000-0000-0000-000000000001', demo_organization_id,
      'expense-category-supplies', '30000000-0000-0000-0000-000000000001',
      'Salon supplies', 54.000, 4.909, 'vat_included', '2026-08-01',
      'card', 'LOCAL-PO-001', 'Local development seed expense.',
      'local-seed-expense-001', demo_user_id
    ),
    (
      '80000000-0000-0000-0000-000000000002', demo_organization_id,
      'expense-category-rent', '30000000-0000-0000-0000-000000000001',
      'Monthly rent and utilities', 385.500, 0.000, 'no_vat', '2026-08-01',
      'bank_transfer', 'LOCAL-RENT-001', 'Local development seed expense.',
      'local-seed-expense-002', demo_user_id
    )
  on conflict (id) do nothing;
end;
$$;
