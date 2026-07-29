create type public.customer_field_type as enum (
  'text', 'number', 'email', 'phone', 'date', 'dropdown', 'checkbox', 'textarea'
);
create type public.service_booking_field_type as enum (
  'text', 'number', 'date', 'dropdown', 'checkbox', 'textarea'
);
create type public.finance_vat_type as enum ('exclusive', 'inclusive');
create type public.payment_kind as enum ('payment', 'refund');
create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'other');

create table public.organization_finance_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  vat_enabled boolean not null default true,
  vat_type public.finance_vat_type not null default 'exclusive',
  vat_rate_percent numeric(6,3) not null default 10.000
    check (vat_rate_percent between 0 and 100),
  vat_registration_number text not null default ''
    check (char_length(vat_registration_number) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organization_finance_settings (organization_id)
select id from public.organizations
on conflict do nothing;

create or replace function private.initialize_finance_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_finance_settings (organization_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger organizations_initialize_finance_settings
after insert on public.organizations
for each row execute function private.initialize_finance_settings();

create table public.customer_field_definitions (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  type public.customer_field_type not null,
  required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index customer_field_definitions_label_unique
  on public.customer_field_definitions (organization_id, lower(btrim(label)))
  where is_active;
create index customer_field_definitions_list
  on public.customer_field_definitions (organization_id, is_active, sort_order);

create table public.customer_field_options (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_id text not null,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  sort_order integer not null check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  foreign key (organization_id, field_id)
    references public.customer_field_definitions (organization_id, id) on delete cascade,
  unique (organization_id, field_id, id),
  unique (organization_id, field_id, sort_order)
);

create unique index customer_field_options_label_unique
  on public.customer_field_options (organization_id, field_id, lower(btrim(label)));

create table public.service_booking_field_definitions (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id text not null,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  type public.service_booking_field_type not null,
  required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, service_id)
    references public.services (organization_id, id) on delete cascade,
  unique (organization_id, id)
);

create unique index service_booking_fields_label_unique
  on public.service_booking_field_definitions (
    organization_id, service_id, lower(btrim(label))
  )
  where is_active;
create index service_booking_fields_list
  on public.service_booking_field_definitions (
    organization_id, service_id, is_active, sort_order
  );

create table public.service_booking_field_options (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_id text not null,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  sort_order integer not null check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  foreign key (organization_id, field_id)
    references public.service_booking_field_definitions (organization_id, id)
    on delete cascade,
  unique (organization_id, field_id, id),
  unique (organization_id, field_id, sort_order)
);

create unique index service_booking_field_options_label_unique
  on public.service_booking_field_options (
    organization_id, field_id, lower(btrim(label))
  );

create table public.organization_finance_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  next_invoice_number bigint not null default 1 check (next_invoice_number > 0)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  issued_on date not null,
  currency_code text not null default 'BHD' check (currency_code = 'BHD'),
  vat_enabled boolean not null,
  vat_type public.finance_vat_type not null,
  vat_rate_percent numeric(6,3) not null check (vat_rate_percent between 0 and 100),
  vat_registration_number text not null default '',
  subtotal_bhd numeric(14,3) not null check (subtotal_bhd >= 0),
  vat_bhd numeric(14,3) not null check (vat_bhd >= 0),
  total_bhd numeric(14,3) not null check (total_bhd >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, invoice_number),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  check (round(subtotal_bhd + vat_bhd, 3) = total_bhd)
);

create index invoices_customer_date
  on public.invoices (organization_id, customer_id, issued_on desc);
create index invoices_date
  on public.invoices (organization_id, issued_on desc, invoice_number);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  appointment_id uuid not null,
  service_id text,
  description text not null check (char_length(btrim(description)) between 1 and 300),
  quantity integer not null default 1 check (quantity between 1 and 100),
  unit_price_bhd numeric(14,3) not null check (unit_price_bhd >= 0),
  vat_applicable boolean not null,
  line_subtotal_bhd numeric(14,3) not null check (line_subtotal_bhd >= 0),
  line_vat_bhd numeric(14,3) not null check (line_vat_bhd >= 0),
  line_total_bhd numeric(14,3) not null check (line_total_bhd >= 0),
  created_at timestamptz not null default now(),
  foreign key (organization_id, invoice_id)
    references public.invoices (organization_id, id) on delete restrict,
  foreign key (organization_id, appointment_id)
    references public.appointments (organization_id, id) on delete restrict,
  unique (organization_id, appointment_id),
  unique (organization_id, id),
  check (round(line_subtotal_bhd + line_vat_bhd, 3) = line_total_bhd)
);

create index invoice_items_invoice
  on public.invoice_items (organization_id, invoice_id, created_at);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid,
  appointment_id uuid,
  kind public.payment_kind not null,
  method public.payment_method not null default 'cash',
  amount_bhd numeric(14,3) not null check (amount_bhd > 0),
  note text not null default '' check (char_length(note) <= 1000),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_by_name text not null default 'System',
  recorded_at timestamptz not null default now(),
  foreign key (organization_id, invoice_id)
    references public.invoices (organization_id, id) on delete restrict,
  foreign key (organization_id, appointment_id)
    references public.appointments (organization_id, id) on delete restrict,
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  check (invoice_id is not null or appointment_id is not null)
);

create index payment_transactions_invoice_time
  on public.payment_transactions (organization_id, invoice_id, recorded_at)
  where invoice_id is not null;
create index payment_transactions_appointment_time
  on public.payment_transactions (organization_id, appointment_id, recorded_at)
  where appointment_id is not null;

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_id uuid not null,
  invoice_item_id uuid not null,
  kind public.payment_kind not null,
  amount_bhd numeric(14,3) not null check (amount_bhd > 0),
  created_at timestamptz not null default now(),
  foreign key (organization_id, transaction_id)
    references public.payment_transactions (organization_id, id) on delete restrict,
  foreign key (organization_id, invoice_item_id)
    references public.invoice_items (organization_id, id) on delete restrict,
  unique (organization_id, transaction_id, invoice_item_id)
);

create index payment_allocations_item
  on public.payment_allocations (organization_id, invoice_item_id, created_at);

create trigger organization_finance_settings_set_updated_at
before update on public.organization_finance_settings
for each row execute function private.set_updated_at();
create trigger customer_field_definitions_set_updated_at
before update on public.customer_field_definitions
for each row execute function private.set_updated_at();
create trigger service_booking_fields_set_updated_at
before update on public.service_booking_field_definitions
for each row execute function private.set_updated_at();
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function private.set_updated_at();

create or replace function private.validate_customer_custom_values()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  field_record record;
  field_value jsonb;
begin
  if exists (
    select 1
    from jsonb_object_keys(new.custom_values) value_key
    where not exists (
      select 1
      from public.customer_field_definitions definition
      where definition.organization_id = new.organization_id
        and definition.id = value_key
    )
  ) then raise exception 'CUSTOMER_FIELD_UNKNOWN'; end if;

  for field_record in
    select definition.*
    from public.customer_field_definitions definition
    where definition.organization_id = new.organization_id
      and definition.is_active
  loop
    field_value := new.custom_values -> field_record.id;
    if field_record.required and (
      field_value is null
      or field_value = '""'::jsonb
      or field_value = 'false'::jsonb
    ) then raise exception 'CUSTOMER_FIELD_REQUIRED:%', field_record.id; end if;
    if field_value is null or field_value = '""'::jsonb
      or field_value = 'false'::jsonb then continue; end if;
    if field_record.type = 'checkbox' and jsonb_typeof(field_value) <> 'boolean' then
      raise exception 'CUSTOMER_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type <> 'checkbox' and jsonb_typeof(field_value) <> 'string' then
      raise exception 'CUSTOMER_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'number'
      and not (field_value #>> '{}') ~ '^-?[0-9]+([.][0-9]+)?$' then
      raise exception 'CUSTOMER_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'email'
      and not (field_value #>> '{}') ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
      raise exception 'CUSTOMER_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'phone'
      and char_length(regexp_replace(field_value #>> '{}', '[^0-9]', '', 'g'))
        not between 8 and 15 then
      raise exception 'CUSTOMER_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'date'
      and not (field_value #>> '{}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'CUSTOMER_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'dropdown' and not exists (
      select 1 from public.customer_field_options option
      where option.organization_id = new.organization_id
        and option.field_id = field_record.id
        and option.id = field_value #>> '{}'
    ) then raise exception 'CUSTOMER_FIELD_OPTION:%', field_record.id; end if;
  end loop;
  return new;
end;
$$;

create trigger customers_validate_custom_values_insert
before insert on public.customers
for each row execute function private.validate_customer_custom_values();
create trigger customers_validate_custom_values_update
before update of custom_values on public.customers
for each row
when (old.custom_values is distinct from new.custom_values)
execute function private.validate_customer_custom_values();

create or replace function private.validate_service_booking_values()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  field_record record;
  field_value jsonb;
begin
  if new.service_id is null then return new; end if;
  if exists (
    select 1
    from jsonb_object_keys(new.service_field_values) value_key
    where not exists (
      select 1
      from public.service_booking_field_definitions definition
      where definition.organization_id = new.organization_id
        and definition.service_id = new.service_id
        and definition.id = value_key
    )
  ) then raise exception 'SERVICE_FIELD_UNKNOWN'; end if;

  for field_record in
    select definition.*
    from public.service_booking_field_definitions definition
    where definition.organization_id = new.organization_id
      and definition.service_id = new.service_id
      and definition.is_active
  loop
    field_value := new.service_field_values -> field_record.id;
    if field_record.required and (
      field_value is null
      or field_value = '""'::jsonb
      or field_value = 'false'::jsonb
    ) then raise exception 'SERVICE_FIELD_REQUIRED:%', field_record.id; end if;
    if field_value is null or field_value = '""'::jsonb
      or field_value = 'false'::jsonb then continue; end if;
    if field_record.type = 'checkbox' and jsonb_typeof(field_value) <> 'boolean' then
      raise exception 'SERVICE_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type <> 'checkbox' and jsonb_typeof(field_value) <> 'string' then
      raise exception 'SERVICE_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'number'
      and not (field_value #>> '{}') ~ '^-?[0-9]+([.][0-9]+)?$' then
      raise exception 'SERVICE_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'date'
      and not (field_value #>> '{}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'SERVICE_FIELD_TYPE:%', field_record.id;
    end if;
    if field_record.type = 'dropdown' and not exists (
      select 1 from public.service_booking_field_options option
      where option.organization_id = new.organization_id
        and option.field_id = field_record.id
        and option.id = field_value #>> '{}'
    ) then raise exception 'SERVICE_FIELD_OPTION:%', field_record.id; end if;
  end loop;
  return new;
end;
$$;

create trigger appointments_validate_service_values_insert
before insert on public.appointments
for each row execute function private.validate_service_booking_values();
create trigger appointments_validate_service_values_update
before update of service_field_values on public.appointments
for each row
when (old.service_field_values is distinct from new.service_field_values)
execute function private.validate_service_booking_values();

create or replace function public.update_finance_settings(
  target_vat_enabled boolean,
  target_vat_type public.finance_vat_type,
  target_vat_rate_percent numeric,
  target_vat_registration_number text
)
returns public.organization_finance_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.organization_finance_settings;
begin
  if actor.id is null or not private.can_module(actor, 'Settings', 'edit') then
    raise exception 'SETTINGS_FORBIDDEN';
  end if;
  if target_vat_rate_percent not between 0 and 100
    or char_length(coalesce(target_vat_registration_number, '')) > 80 then
    raise exception 'FINANCE_SETTINGS_INVALID';
  end if;

  insert into public.organization_finance_settings (
    organization_id, vat_enabled, vat_type, vat_rate_percent,
    vat_registration_number
  ) values (
    actor.organization_id, coalesce(target_vat_enabled, false),
    coalesce(target_vat_type, 'exclusive'),
    round(coalesce(target_vat_rate_percent, 0), 3),
    btrim(coalesce(target_vat_registration_number, ''))
  )
  on conflict (organization_id) do update
  set vat_enabled = excluded.vat_enabled,
      vat_type = excluded.vat_type,
      vat_rate_percent = excluded.vat_rate_percent,
      vat_registration_number = excluded.vat_registration_number
  returning * into result;
  return result;
end;
$$;

create or replace function public.replace_customer_field_definitions(
  target_fields jsonb
)
returns setof public.customer_field_definitions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  field_record record;
  option_record record;
  retained_ids text[] := '{}';
  removed_ids text[];
begin
  if actor.id is null or not private.can_module(actor, 'Settings', 'edit') then
    raise exception 'CUSTOMER_FIELDS_FORBIDDEN';
  end if;
  if jsonb_typeof(target_fields) <> 'array'
    or jsonb_array_length(target_fields) > 100 then
    raise exception 'CUSTOMER_FIELDS_INVALID';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(target_fields) as candidate(
      id text, label text, type public.customer_field_type,
      required boolean, sort_order integer, options jsonb
    )
    group by candidate.id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(target_fields) as candidate(
      id text, label text, type public.customer_field_type,
      required boolean, sort_order integer, options jsonb
    )
    group by lower(btrim(candidate.label))
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(target_fields) as candidate(
      id text, label text, type public.customer_field_type,
      required boolean, sort_order integer, options jsonb
    )
    group by candidate.sort_order
    having count(*) > 1
  ) then raise exception 'CUSTOMER_FIELDS_DUPLICATE'; end if;

  update public.customer_field_definitions
  set is_active = false
  where organization_id = actor.organization_id;

  for field_record in
    select *
    from jsonb_to_recordset(target_fields) as field_data(
      id text, label text, type public.customer_field_type,
      required boolean, sort_order integer, options jsonb
    )
    order by sort_order
  loop
    if char_length(btrim(coalesce(field_record.id, ''))) not between 8 and 200
      or char_length(btrim(coalesce(field_record.label, ''))) not between 1 and 160
      or field_record.sort_order not between 0 and 999
      or jsonb_typeof(coalesce(field_record.options, '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(field_record.options, '[]'::jsonb)) > 100 then
      raise exception 'CUSTOMER_FIELDS_INVALID';
    end if;
    if field_record.type = 'dropdown'
      and jsonb_array_length(field_record.options) = 0 then
      raise exception 'CUSTOMER_FIELD_OPTIONS_REQUIRED';
    end if;

    insert into public.customer_field_definitions (
      id, organization_id, label, type, required, is_active, sort_order
    ) values (
      field_record.id, actor.organization_id, btrim(field_record.label),
      field_record.type, coalesce(field_record.required, false), true,
      field_record.sort_order
    )
    on conflict (id) do update
    set label = excluded.label,
        type = excluded.type,
        required = excluded.required,
        is_active = true,
        sort_order = excluded.sort_order
    where public.customer_field_definitions.organization_id = actor.organization_id;
    if not found then raise exception 'CUSTOMER_FIELD_TENANT_CONFLICT'; end if;

    retained_ids := array_append(retained_ids, field_record.id);
    delete from public.customer_field_options
    where organization_id = actor.organization_id
      and field_id = field_record.id;

    if field_record.type = 'dropdown' then
      for option_record in
        select *
        from jsonb_to_recordset(field_record.options) as option_data(
          id text, label text, sort_order integer
        )
        order by sort_order
      loop
        if char_length(btrim(coalesce(option_record.id, ''))) not between 8 and 200
          or char_length(btrim(coalesce(option_record.label, ''))) not between 1 and 160
          or option_record.sort_order not between 0 and 999 then
          raise exception 'CUSTOMER_FIELD_OPTIONS_INVALID';
        end if;
        insert into public.customer_field_options (
          id, organization_id, field_id, label, sort_order
        ) values (
          option_record.id, actor.organization_id, field_record.id,
          btrim(option_record.label), option_record.sort_order
        );
      end loop;
    end if;
  end loop;

  select coalesce(array_agg(id), '{}')
    into removed_ids
  from public.customer_field_definitions
  where organization_id = actor.organization_id
    and not (id = any(retained_ids));

  if cardinality(removed_ids) > 0 then
    update public.customers
    set custom_values = custom_values - removed_ids
    where organization_id = actor.organization_id
      and custom_values ?| removed_ids;
    delete from public.customer_field_definitions
    where organization_id = actor.organization_id
      and id = any(removed_ids);
  end if;

  return query
  select *
  from public.customer_field_definitions
  where organization_id = actor.organization_id and is_active
  order by sort_order;
exception
  when unique_violation then
    raise exception 'CUSTOMER_FIELDS_DUPLICATE';
end;
$$;

create or replace function public.replace_service_booking_fields(
  target_service_id text,
  target_fields jsonb
)
returns setof public.service_booking_field_definitions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  field_record record;
  option_record record;
  retained_ids text[] := '{}';
begin
  if actor.id is null or not private.can_module(actor, 'Services', 'edit') then
    raise exception 'SERVICE_FIELDS_FORBIDDEN';
  end if;
  if not exists (
    select 1 from public.services service
    where service.organization_id = actor.organization_id
      and service.id = target_service_id
  ) or jsonb_typeof(target_fields) <> 'array'
    or jsonb_array_length(target_fields) > 100 then
    raise exception 'SERVICE_FIELDS_INVALID';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(target_fields) as candidate(
      id text, label text, type public.service_booking_field_type,
      required boolean, sort_order integer, options jsonb
    )
    group by candidate.id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(target_fields) as candidate(
      id text, label text, type public.service_booking_field_type,
      required boolean, sort_order integer, options jsonb
    )
    group by lower(btrim(candidate.label))
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(target_fields) as candidate(
      id text, label text, type public.service_booking_field_type,
      required boolean, sort_order integer, options jsonb
    )
    group by candidate.sort_order
    having count(*) > 1
  ) then raise exception 'SERVICE_FIELDS_DUPLICATE'; end if;

  update public.service_booking_field_definitions
  set is_active = false
  where organization_id = actor.organization_id
    and service_id = target_service_id;

  for field_record in
    select *
    from jsonb_to_recordset(target_fields) as field_data(
      id text, label text, type public.service_booking_field_type,
      required boolean, sort_order integer, options jsonb
    )
    order by sort_order
  loop
    if char_length(btrim(coalesce(field_record.id, ''))) not between 8 and 200
      or char_length(btrim(coalesce(field_record.label, ''))) not between 1 and 160
      or field_record.sort_order not between 0 and 999
      or jsonb_typeof(coalesce(field_record.options, '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(field_record.options, '[]'::jsonb)) > 100 then
      raise exception 'SERVICE_FIELDS_INVALID';
    end if;
    if field_record.type = 'dropdown'
      and jsonb_array_length(field_record.options) = 0 then
      raise exception 'SERVICE_FIELD_OPTIONS_REQUIRED';
    end if;

    insert into public.service_booking_field_definitions (
      id, organization_id, service_id, label, type, required, is_active, sort_order
    ) values (
      field_record.id, actor.organization_id, target_service_id,
      btrim(field_record.label), field_record.type,
      coalesce(field_record.required, false), true, field_record.sort_order
    )
    on conflict (id) do update
    set label = excluded.label,
        type = excluded.type,
        required = excluded.required,
        is_active = true,
        sort_order = excluded.sort_order
    where public.service_booking_field_definitions.organization_id = actor.organization_id
      and public.service_booking_field_definitions.service_id = target_service_id;
    if not found then raise exception 'SERVICE_FIELD_TENANT_CONFLICT'; end if;

    retained_ids := array_append(retained_ids, field_record.id);
    delete from public.service_booking_field_options
    where organization_id = actor.organization_id and field_id = field_record.id;

    if field_record.type = 'dropdown' then
      for option_record in
        select *
        from jsonb_to_recordset(field_record.options) as option_data(
          id text, label text, sort_order integer
        )
        order by sort_order
      loop
        if char_length(btrim(coalesce(option_record.id, ''))) not between 8 and 200
          or char_length(btrim(coalesce(option_record.label, ''))) not between 1 and 160
          or option_record.sort_order not between 0 and 999 then
          raise exception 'SERVICE_FIELD_OPTIONS_INVALID';
        end if;
        insert into public.service_booking_field_options (
          id, organization_id, field_id, label, sort_order
        ) values (
          option_record.id, actor.organization_id, field_record.id,
          btrim(option_record.label), option_record.sort_order
        );
      end loop;
    end if;
  end loop;

  update public.service_booking_field_definitions
  set is_active = false
  where organization_id = actor.organization_id
    and service_id = target_service_id
    and not (id = any(retained_ids));

  return query
  select *
  from public.service_booking_field_definitions
  where organization_id = actor.organization_id
    and service_id = target_service_id and is_active
  order by sort_order;
exception
  when unique_violation then
    raise exception 'SERVICE_FIELDS_DUPLICATE';
end;
$$;

create or replace function public.create_invoice_from_appointments(
  target_appointment_ids uuid[],
  target_issued_on date,
  target_created_by_name text
)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  settings public.organization_finance_settings;
  customer_record public.customers;
  result public.invoices;
  appointment_record public.appointments;
  item_record public.invoice_items;
  next_number bigint;
  expected_count integer;
  taxable boolean;
  line_subtotal numeric(14,3);
  line_vat numeric(14,3);
  line_total numeric(14,3);
  transaction_record public.payment_transactions;
begin
  if actor.id is null or not private.can_module(actor, 'Invoices', 'create') then
    raise exception 'INVOICE_FORBIDDEN';
  end if;
  expected_count := cardinality(target_appointment_ids);
  if expected_count is null or expected_count not between 1 and 50
    or target_issued_on is null
    or (select count(distinct value) from unnest(target_appointment_ids) value)
      <> expected_count then
    raise exception 'INVOICE_INPUT_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor.organization_id::text || ':invoice-number', 0)
  );
  perform appointment.id
  from public.appointments appointment
  where appointment.organization_id = actor.organization_id
    and appointment.id = any(target_appointment_ids)
  order by appointment.id
  for update;

  if (
    select count(*)
    from public.appointments appointment
    where appointment.organization_id = actor.organization_id
      and appointment.id = any(target_appointment_ids)
      and appointment.status <> 'cancelled'
  ) <> expected_count then
    raise exception 'INVOICE_APPOINTMENT_INVALID';
  end if;
  if (
    select count(distinct customer_id)
    from public.appointments
    where organization_id = actor.organization_id
      and id = any(target_appointment_ids)
  ) <> 1 then
    raise exception 'INVOICE_CUSTOMER_MISMATCH';
  end if;
  if exists (
    select 1 from public.invoice_items
    where organization_id = actor.organization_id
      and appointment_id = any(target_appointment_ids)
  ) then raise exception 'APPOINTMENT_ALREADY_INVOICED'; end if;

  select customer.* into customer_record
  from public.customers customer
  where customer.organization_id = actor.organization_id
    and customer.id = (
      select appointment.customer_id
      from public.appointments appointment
      where appointment.organization_id = actor.organization_id
        and appointment.id = target_appointment_ids[1]
    );
  if customer_record.id is null then raise exception 'INVOICE_CUSTOMER_INVALID'; end if;

  select * into settings
  from public.organization_finance_settings
  where organization_id = actor.organization_id;
  if settings.organization_id is null then
    insert into public.organization_finance_settings (organization_id)
    values (actor.organization_id)
    returning * into settings;
  end if;

  insert into public.organization_finance_counters (
    organization_id, next_invoice_number
  ) values (actor.organization_id, 2)
  on conflict (organization_id) do update
    set next_invoice_number =
      public.organization_finance_counters.next_invoice_number + 1
  returning next_invoice_number - 1 into next_number;

  insert into public.invoices (
    organization_id, invoice_number, customer_id, customer_name,
    customer_phone, customer_email, issued_on, vat_enabled, vat_type,
    vat_rate_percent, vat_registration_number, subtotal_bhd, vat_bhd,
    total_bhd, created_by, created_by_name
  ) values (
    actor.organization_id, 'INV-' || lpad(next_number::text, 6, '0'),
    customer_record.id, customer_record.name, customer_record.phone,
    customer_record.email, target_issued_on, settings.vat_enabled,
    settings.vat_type, settings.vat_rate_percent,
    settings.vat_registration_number, 0, 0, 0, (select auth.uid()),
    coalesce(nullif(btrim(target_created_by_name), ''), 'System')
  ) returning * into result;

  for appointment_record in
    select *
    from public.appointments appointment
    where appointment.organization_id = actor.organization_id
      and appointment.id = any(target_appointment_ids)
    order by appointment.starts_at, appointment.id
  loop
    taxable := case
      when appointment_record.service_id is not null then coalesce((
        select service.vat_applicable
        from public.services service
        where service.organization_id = actor.organization_id
          and service.id = appointment_record.service_id
      ), true)
      else coalesce((
        select bool_or(service.vat_applicable)
        from public.package_items package_item
        join public.services service
          on service.organization_id = package_item.organization_id
         and service.id = package_item.service_id
        where package_item.organization_id = actor.organization_id
          and package_item.package_id = appointment_record.package_id
      ), true)
    end;

    if not settings.vat_enabled or not taxable or settings.vat_rate_percent = 0 then
      line_subtotal := round(appointment_record.price_bhd, 3);
      line_vat := 0;
      line_total := line_subtotal;
    elsif settings.vat_type = 'inclusive' then
      line_total := round(appointment_record.price_bhd, 3);
      line_subtotal := round(
        line_total / (1 + settings.vat_rate_percent / 100), 3
      );
      line_vat := line_total - line_subtotal;
    else
      line_subtotal := round(appointment_record.price_bhd, 3);
      line_vat := round(
        line_subtotal * settings.vat_rate_percent / 100, 3
      );
      line_total := line_subtotal + line_vat;
    end if;

    insert into public.invoice_items (
      organization_id, invoice_id, appointment_id, service_id, description,
      quantity, unit_price_bhd, vat_applicable, line_subtotal_bhd,
      line_vat_bhd, line_total_bhd
    ) values (
      actor.organization_id, result.id, appointment_record.id,
      appointment_record.service_id, appointment_record.offering_name, 1,
      appointment_record.price_bhd, taxable, line_subtotal, line_vat, line_total
    ) returning * into item_record;

    for transaction_record in
      update public.payment_transactions
      set invoice_id = result.id
      where organization_id = actor.organization_id
        and appointment_id = appointment_record.id
        and invoice_id is null
      returning *
    loop
      insert into public.payment_allocations (
        organization_id, transaction_id, invoice_item_id, kind, amount_bhd
      ) values (
        actor.organization_id, transaction_record.id, item_record.id,
        transaction_record.kind, transaction_record.amount_bhd
      );
    end loop;
  end loop;

  update public.invoices invoice
  set subtotal_bhd = totals.subtotal,
      vat_bhd = totals.vat,
      total_bhd = totals.total
  from (
    select
      round(sum(line_subtotal_bhd), 3) subtotal,
      round(sum(line_vat_bhd), 3) vat,
      round(sum(line_total_bhd), 3) total
    from public.invoice_items
    where organization_id = actor.organization_id and invoice_id = result.id
  ) totals
  where invoice.organization_id = actor.organization_id
    and invoice.id = result.id
  returning invoice.* into result;
  return result;
end;
$$;

create or replace function public.record_invoice_payment(
  target_invoice_id uuid,
  target_kind public.payment_kind,
  target_method public.payment_method,
  target_amount_bhd numeric,
  target_note text,
  target_idempotency_key text,
  target_recorded_by_name text
)
returns public.payment_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  invoice_record public.invoices;
  result public.payment_transactions;
  item_record record;
  remaining numeric(14,3);
  available numeric(14,3);
  net_paid numeric(14,3);
begin
  if actor.id is null or not private.can_module(actor, 'Invoices', 'edit') then
    raise exception 'PAYMENT_FORBIDDEN';
  end if;
  if target_amount_bhd is null or round(target_amount_bhd, 3) <= 0
    or char_length(btrim(coalesce(target_idempotency_key, ''))) not between 8 and 200
    or char_length(coalesce(target_note, '')) > 1000 then
    raise exception 'PAYMENT_INVALID';
  end if;

  select * into result
  from public.payment_transactions
  where organization_id = actor.organization_id
    and idempotency_key = target_idempotency_key;
  if result.id is not null then return result; end if;

  select * into invoice_record
  from public.invoices
  where organization_id = actor.organization_id and id = target_invoice_id
  for update;
  if invoice_record.id is null then raise exception 'INVOICE_NOT_FOUND'; end if;

  select coalesce(sum(
    case when kind = 'payment' then amount_bhd else -amount_bhd end
  ), 0)
    into net_paid
  from public.payment_transactions
  where organization_id = actor.organization_id
    and invoice_id = invoice_record.id;

  if target_kind = 'payment'
    and round(target_amount_bhd, 3) > invoice_record.total_bhd - net_paid then
    raise exception 'PAYMENT_EXCEEDS_BALANCE';
  end if;
  if target_kind = 'refund'
    and round(target_amount_bhd, 3) > net_paid then
    raise exception 'REFUND_EXCEEDS_PAID';
  end if;

  insert into public.payment_transactions (
    organization_id, invoice_id, kind, method, amount_bhd, note,
    idempotency_key, recorded_by, recorded_by_name
  ) values (
    actor.organization_id, invoice_record.id, target_kind,
    coalesce(target_method, 'cash'), round(target_amount_bhd, 3),
    btrim(coalesce(target_note, '')), btrim(target_idempotency_key),
    (select auth.uid()),
    coalesce(nullif(btrim(target_recorded_by_name), ''), 'System')
  ) returning * into result;

  remaining := result.amount_bhd;
  for item_record in
    select
      item.id,
      item.appointment_id,
      item.line_total_bhd,
      coalesce(sum(
        case when allocation.kind = 'payment'
          then allocation.amount_bhd else -allocation.amount_bhd end
      ), 0) allocated
    from public.invoice_items item
    left join public.payment_allocations allocation
      on allocation.organization_id = item.organization_id
     and allocation.invoice_item_id = item.id
    where item.organization_id = actor.organization_id
      and item.invoice_id = invoice_record.id
    group by item.id
    order by
      case when target_kind = 'payment' then min(item.created_at) end asc,
      case when target_kind = 'refund' then min(item.created_at) end desc,
      item.id
  loop
    exit when remaining <= 0;
    available := case
      when target_kind = 'payment'
        then item_record.line_total_bhd - item_record.allocated
      else item_record.allocated
    end;
    if available > 0 then
      insert into public.payment_allocations (
        organization_id, transaction_id, invoice_item_id, kind, amount_bhd
      ) values (
        actor.organization_id, result.id, item_record.id, target_kind,
        least(remaining, available)
      );
      remaining := remaining - least(remaining, available);
    end if;
  end loop;
  if remaining <> 0 then raise exception 'PAYMENT_ALLOCATION_FAILED'; end if;

  update public.appointments appointment
  set advance_paid_bhd = allocation_totals.net_amount
  from (
    select
      item.appointment_id,
      coalesce(sum(
        case when allocation.kind = 'payment'
          then allocation.amount_bhd else -allocation.amount_bhd end
      ), 0) net_amount
    from public.invoice_items item
    left join public.payment_allocations allocation
      on allocation.organization_id = item.organization_id
     and allocation.invoice_item_id = item.id
    where item.organization_id = actor.organization_id
      and item.invoice_id = invoice_record.id
    group by item.appointment_id
  ) allocation_totals
  where appointment.organization_id = actor.organization_id
    and appointment.id = allocation_totals.appointment_id;

  return result;
exception
  when unique_violation then
    select * into result
    from public.payment_transactions
    where organization_id = actor.organization_id
      and idempotency_key = target_idempotency_key;
    if result.id is not null then return result; end if;
    raise;
end;
$$;

create or replace function public.update_appointment_payment(
  target_appointment_id uuid,
  target_amount_bhd numeric
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  appointment_record public.appointments;
  invoice_item_record public.invoice_items;
  transaction_record public.payment_transactions;
  difference numeric(14,3);
  transaction_kind public.payment_kind;
begin
  if actor.id is null or not (
    private.can_module(actor, 'Appointments', 'edit')
    or private.can_module(actor, 'Invoices', 'edit')
  ) then raise exception 'PAYMENT_FORBIDDEN'; end if;
  if target_amount_bhd is null or round(target_amount_bhd, 3) < 0 then
    raise exception 'PAYMENT_INVALID';
  end if;

  select * into appointment_record
  from public.appointments
  where organization_id = actor.organization_id and id = target_appointment_id
  for update;
  if appointment_record.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if round(target_amount_bhd, 3) > appointment_record.price_bhd then
    raise exception 'PAYMENT_EXCEEDS_APPOINTMENT';
  end if;

  difference := round(target_amount_bhd, 3) - appointment_record.advance_paid_bhd;
  if difference = 0 then return appointment_record; end if;
  transaction_kind := case when difference > 0 then 'payment' else 'refund' end;

  select * into invoice_item_record
  from public.invoice_items
  where organization_id = actor.organization_id
    and appointment_id = appointment_record.id;

  insert into public.payment_transactions (
    organization_id, invoice_id, appointment_id, kind, method, amount_bhd,
    note, idempotency_key, recorded_by, recorded_by_name
  ) values (
    actor.organization_id, invoice_item_record.invoice_id,
    appointment_record.id, transaction_kind, 'cash', abs(difference),
    'Appointment advance adjustment',
    'appointment-adjustment-' || gen_random_uuid()::text,
    (select auth.uid()), 'Appointment payment'
  ) returning * into transaction_record;

  if invoice_item_record.id is not null then
    if transaction_kind = 'payment' and abs(difference) > (
      invoice_item_record.line_total_bhd - appointment_record.advance_paid_bhd
    ) then raise exception 'PAYMENT_EXCEEDS_BALANCE'; end if;
    if transaction_kind = 'refund'
      and abs(difference) > appointment_record.advance_paid_bhd then
      raise exception 'REFUND_EXCEEDS_PAID';
    end if;
    insert into public.payment_allocations (
      organization_id, transaction_id, invoice_item_id, kind, amount_bhd
    ) values (
      actor.organization_id, transaction_record.id, invoice_item_record.id,
      transaction_kind, abs(difference)
    );
  end if;

  update public.appointments
  set advance_paid_bhd = round(target_amount_bhd, 3)
  where organization_id = actor.organization_id and id = appointment_record.id
  returning * into appointment_record;
  return appointment_record;
end;
$$;

alter table public.organization_finance_settings enable row level security;
alter table public.customer_field_definitions enable row level security;
alter table public.customer_field_options enable row level security;
alter table public.service_booking_field_definitions enable row level security;
alter table public.service_booking_field_options enable row level security;
alter table public.organization_finance_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_allocations enable row level security;

create policy "members can view finance settings"
on public.organization_finance_settings for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "members can view customer field definitions"
on public.customer_field_definitions for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "members can view customer field options"
on public.customer_field_options for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "members can view service booking fields"
on public.service_booking_field_definitions for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "members can view service booking field options"
on public.service_booking_field_options for select to authenticated
using (private.is_active_organization_member(organization_id));
create policy "members can view invoices"
on public.invoices for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Invoices', 'view'))
);
create policy "members can view invoice items"
on public.invoice_items for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Invoices', 'view'))
);
create policy "members can view payment transactions"
on public.payment_transactions for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Invoices', 'view'))
);
create policy "members can view payment allocations"
on public.payment_allocations for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Invoices', 'view'))
);

revoke all on table public.organization_finance_settings from anon, authenticated;
revoke all on table public.customer_field_definitions from anon, authenticated;
revoke all on table public.customer_field_options from anon, authenticated;
revoke all on table public.service_booking_field_definitions from anon, authenticated;
revoke all on table public.service_booking_field_options from anon, authenticated;
revoke all on table public.organization_finance_counters from anon, authenticated;
revoke all on table public.invoices from anon, authenticated;
revoke all on table public.invoice_items from anon, authenticated;
revoke all on table public.payment_transactions from anon, authenticated;
revoke all on table public.payment_allocations from anon, authenticated;

grant select on table public.organization_finance_settings to authenticated;
grant select on table public.customer_field_definitions to authenticated;
grant select on table public.customer_field_options to authenticated;
grant select on table public.service_booking_field_definitions to authenticated;
grant select on table public.service_booking_field_options to authenticated;
grant select on table public.invoices to authenticated;
grant select on table public.invoice_items to authenticated;
grant select on table public.payment_transactions to authenticated;
grant select on table public.payment_allocations to authenticated;

revoke all on function public.update_finance_settings(
  boolean, public.finance_vat_type, numeric, text
) from public;
revoke all on function public.replace_customer_field_definitions(jsonb) from public;
revoke all on function public.replace_service_booking_fields(text, jsonb) from public;
revoke all on function public.create_invoice_from_appointments(
  uuid[], date, text
) from public;
revoke all on function public.record_invoice_payment(
  uuid, public.payment_kind, public.payment_method, numeric, text, text, text
) from public;
revoke all on function public.update_appointment_payment(uuid, numeric)
  from public;
revoke all on function private.initialize_finance_settings() from public;
revoke all on function private.validate_customer_custom_values() from public;
revoke all on function private.validate_service_booking_values() from public;

grant execute on function public.update_finance_settings(
  boolean, public.finance_vat_type, numeric, text
) to authenticated;
grant execute on function public.replace_customer_field_definitions(jsonb)
  to authenticated;
grant execute on function public.replace_service_booking_fields(text, jsonb)
  to authenticated;
grant execute on function public.create_invoice_from_appointments(
  uuid[], date, text
) to authenticated;
grant execute on function public.record_invoice_payment(
  uuid, public.payment_kind, public.payment_method, numeric, text, text, text
) to authenticated;
grant execute on function public.update_appointment_payment(uuid, numeric)
  to authenticated;

comment on table public.invoices is
  'Immutable BHD invoice and VAT snapshots. Application roles have read-only table access.';
comment on table public.payment_transactions is
  'Append-only payments and refunds. Receipt files and external payment providers are not enabled.';
comment on table public.customer_field_definitions is
  'Persistent customer custom-field definitions; answers remain capped JSONB on customers.';
comment on table public.service_booking_field_definitions is
  'Persistent service booking-field definitions; historical appointment answers remain snapshots.';
