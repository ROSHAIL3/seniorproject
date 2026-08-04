alter table public.appointments
  add column public_legacy_access_code_hash text,
  add column public_access_code_seed uuid;

alter table public.appointments
  add constraint appointments_public_legacy_access_code_hash
  check (
    public_legacy_access_code_hash is null
    or public_legacy_access_code_hash ~ '^[a-f0-9]{64}$'
  );

comment on column public.appointments.public_legacy_access_code_hash is
  'One-way hash retained only so access codes issued before the six-character migration continue to work.';

update public.appointments
set public_legacy_access_code_hash = public_access_code_hash,
    public_access_code_seed = public_reference_token
where booking_source = 'public'
  and public_reference_token is not null;

alter table public.appointments
  add constraint appointments_public_access_code_seed
  check (
    booking_source <> 'public'
    or public_reference_token is null
    or public_access_code_seed is not null
  );

create or replace function booking_private.normalize_access_code(
  access_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(access_code, ''), '[[:space:]]', '', 'g'));
$$;

create or replace function booking_private.access_code_from_token(
  reference_token uuid
)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(
    substr(
      '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
      (get_byte(extensions.digest(reference_token::text, 'sha256'), position) % 32) + 1,
      1
    ),
    '' order by position
  )
  from generate_series(0, 5) as positions(position);
$$;

create or replace function booking_private.hash_access_code(
  access_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      booking_private.normalize_access_code(access_code),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function booking_private.hash_legacy_access_code(
  access_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      upper(regexp_replace(coalesce(access_code, ''), '[^A-Fa-f0-9]', '', 'g')),
      'sha256'
    ),
    'hex'
  );
$$;

update public.appointments
set public_access_code_hash = booking_private.hash_access_code(
  booking_private.access_code_from_token(public_access_code_seed)
)
where booking_source = 'public'
  and public_access_code_seed is not null;

do $$
declare
  collision record;
  candidate_seed uuid;
  candidate_hash text;
  candidate_available boolean;
  attempt integer;
begin
  for collision in
    select ranked.id, ranked.organization_id
    from (
      select
        appointment.id,
        appointment.organization_id,
        row_number() over (
          partition by appointment.organization_id,
            appointment.public_access_code_hash
          order by appointment.created_at, appointment.id
        ) as collision_number
      from public.appointments appointment
      where appointment.booking_source = 'public'
        and appointment.public_access_code_hash is not null
    ) ranked
    where ranked.collision_number > 1
  loop
    candidate_available := false;
    for attempt in 1..8 loop
      candidate_seed := gen_random_uuid();
      candidate_hash := booking_private.hash_access_code(
        booking_private.access_code_from_token(candidate_seed)
      );
      candidate_available := not exists (
        select 1
        from public.appointments existing
        where existing.organization_id = collision.organization_id
          and existing.public_access_code_hash = candidate_hash
      );
      exit when candidate_available;
    end loop;

    if not candidate_available then
      raise exception 'PUBLIC_ACCESS_CODE_BACKFILL_COLLISION';
    end if;

    update public.appointments
    set public_access_code_seed = candidate_seed,
        public_access_code_hash = candidate_hash
    where id = collision.id;
  end loop;
end;
$$;

create unique index appointments_public_access_code_unique
  on public.appointments (organization_id, public_access_code_hash)
  where booking_source = 'public' and public_access_code_hash is not null;

create or replace function booking_private.set_public_access_code_hash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_seed uuid;
  candidate_hash text;
  attempt integer;
begin
  if new.booking_source <> 'public'
    or new.public_reference_token is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.public_reference_token is distinct from old.public_reference_token then
      new.public_access_code_seed := new.public_reference_token;
    end if;
  end if;

  candidate_seed := coalesce(
    new.public_access_code_seed,
    new.public_reference_token
  );

  for attempt in 1..8 loop
    candidate_hash := booking_private.hash_access_code(
      booking_private.access_code_from_token(candidate_seed)
    );

    if not exists (
      select 1
      from public.appointments existing
      where existing.organization_id = new.organization_id
        and existing.booking_source = 'public'
        and existing.public_access_code_hash = candidate_hash
        and existing.id is distinct from new.id
    ) then
      new.public_access_code_seed := candidate_seed;
      new.public_access_code_hash := candidate_hash;
      return new;
    end if;

    candidate_seed := gen_random_uuid();
  end loop;

  raise exception 'PUBLIC_ACCESS_CODE_COLLISION';
end;
$$;

create or replace function booking_private.get_public_booking_confirmation(
  booking_slug text,
  reference_token uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bookingNumber', appointment.booking_number,
    'organizationName', organization.name,
    'serviceName', appointment.offering_name,
    'staffName', appointment.staff_name,
    'branchName', branch.name,
    'startsAt', appointment.starts_at,
    'endsAt', appointment.ends_at,
    'status', appointment.status,
    'timeZone', organization.time_zone,
    'accessCode',
      booking_private.access_code_from_token(appointment.public_access_code_seed)
  )
  from public.appointments appointment
  join public.organizations organization
    on organization.id = appointment.organization_id
   and organization.slug = lower(btrim(booking_slug))
   and organization.status = 'active'
   and organization.public_booking_enabled
  join public.branches branch
    on branch.organization_id = appointment.organization_id
   and branch.id = appointment.branch_id
  where appointment.booking_source = 'public'
    and appointment.public_reference_token = reference_token
  limit 1;
$$;

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
  normalized_phone text := private.normalized_phone(customer_phone);
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
    or char_length(normalized_phone) not between 3 and 40
  then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  if not booking_private.register_self_service_attempt(
    organization.id, 'login', request_fingerprint, normalized_phone
  ) then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_RATE_LIMITED');
  end if;

  if not (new_code_is_valid or legacy_code_is_valid) then
    return jsonb_build_object('ok', false, 'error', 'ACCESS_INVALID');
  end if;

  select customer.* into customer_record
  from public.customers customer
  where customer.organization_id = organization.id
    and customer.normalized_phone = normalized_phone
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

revoke all on function booking_private.normalize_access_code(text) from public;
revoke all on function booking_private.access_code_from_token(uuid) from public;
revoke all on function booking_private.hash_access_code(text) from public;
revoke all on function booking_private.hash_legacy_access_code(text) from public;
revoke all on function booking_private.set_public_access_code_hash() from public;
revoke all on function booking_private.authenticate_customer_bookings(text, text, text, text) from public;
revoke all on function booking_private.get_public_booking_confirmation(text, uuid) from public;

grant execute on function booking_private.authenticate_customer_bookings(text, text, text, text)
  to service_role;

