create or replace function booking_private.authenticate_customer_bookings(
  booking_slug text,
  customer_phone text,
  access_code text,
  request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization public.organizations :=
    booking_private.public_booking_organization(booking_slug);
  normalized_customer_phone text := private.normalized_phone(customer_phone);
  normalized_access_code text :=
    booking_private.normalize_access_code(access_code);
  new_code_is_valid boolean :=
    normalized_access_code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$';
  legacy_code_is_valid boolean :=
    char_length(
      regexp_replace(coalesce(access_code, ''), '[^A-Fa-f0-9]', '', 'g')
    ) = 12;
  customer_record public.customers;
begin
  if organization.id is null
    or char_length(normalized_customer_phone) not between 3 and 40
  then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  if not booking_private.register_self_service_attempt(
    organization.id, 'login', request_fingerprint, normalized_customer_phone
  ) then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_RATE_LIMITED');
  end if;

  if not (new_code_is_valid or legacy_code_is_valid) then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  select customer.* into customer_record
  from public.customers customer
  where customer.organization_id = organization.id
    and customer.normalized_phone = normalized_customer_phone
    and exists (
      select 1
      from public.appointments appointment
      where appointment.organization_id = customer.organization_id
        and appointment.customer_id = customer.id
        and (
          (
            new_code_is_valid
            and appointment.public_access_code_hash =
              booking_private.hash_access_code(normalized_access_code)
          )
          or (
            legacy_code_is_valid
            and appointment.public_legacy_access_code_hash =
              booking_private.hash_legacy_access_code(access_code)
          )
        )
    )
  limit 1;

  if customer_record.id is null then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  return jsonb_build_object(
    'ok', true,
    'organizationId', organization.id,
    'customerId', customer_record.id
  );
end;
$$;

revoke all on function booking_private.authenticate_customer_bookings(
  text, text, text, text
) from public;
grant execute on function booking_private.authenticate_customer_bookings(
  text, text, text, text
) to service_role;

comment on function booking_private.authenticate_customer_bookings(
  text, text, text, text
) is
  'Verifies tenant-scoped phone and hashed access codes without ambiguous column references or enumeration details.';
