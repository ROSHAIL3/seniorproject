create type public.expense_category_status as enum ('active', 'archived');
create type public.expense_vat_treatment as enum (
  'vat_included', 'vat_added_separately', 'no_vat'
);

create table public.expense_categories (
  id text primary key,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  color_hex text not null default '#465FFF'
    check (color_hex ~ '^#[0-9A-F]{6}$'),
  status public.expense_category_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index expense_categories_name_unique
  on public.expense_categories (organization_id, lower(btrim(name)));
create index expense_categories_list
  on public.expense_categories (organization_id, status, name);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  category_id text not null,
  branch_id uuid not null,
  description text not null default ''
    check (char_length(description) <= 500),
  amount_bhd numeric(14,3) not null check (amount_bhd > 0),
  input_vat_bhd numeric(14,3) not null default 0
    check (input_vat_bhd >= 0 and input_vat_bhd <= amount_bhd),
  vat_treatment public.expense_vat_treatment not null,
  incurred_on date not null,
  payment_method public.payment_method not null,
  reference_number text not null default ''
    check (char_length(reference_number) <= 160),
  notes text not null default '' check (char_length(notes) <= 2000),
  submission_id text not null
    check (char_length(submission_id) between 8 and 200),
  created_by uuid references auth.users(id) on delete set null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, category_id)
    references public.expense_categories (organization_id, id)
    on delete restrict,
  foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete restrict,
  unique (organization_id, id),
  unique (organization_id, submission_id),
  check (vat_treatment <> 'no_vat' or input_vat_bhd = 0)
);

create index expenses_date
  on public.expenses (organization_id, incurred_on desc, id)
  where deleted_at is null;
create index expenses_category_date
  on public.expenses (organization_id, category_id, incurred_on desc)
  where deleted_at is null;
create index expenses_branch_date
  on public.expenses (organization_id, branch_id, incurred_on desc)
  where deleted_at is null;

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function private.set_updated_at();

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function private.set_updated_at();

create or replace function public.upsert_expense_category(
  target_category_id text,
  category_name text,
  category_color_hex text
)
returns public.expense_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  result public.expense_categories;
  permission_action text := case
    when target_category_id is null then 'create' else 'edit'
  end;
begin
  if actor.id is null
    or not private.can_module(actor, 'Expenses', permission_action) then
    raise exception 'EXPENSE_CATEGORY_FORBIDDEN';
  end if;
  if char_length(btrim(coalesce(category_name, ''))) not between 1 and 160
    or upper(coalesce(category_color_hex, '')) !~ '^#[0-9A-F]{6}$' then
    raise exception 'EXPENSE_CATEGORY_INVALID';
  end if;

  if target_category_id is null then
    insert into public.expense_categories (
      id, organization_id, name, color_hex, created_by
    ) values (
      'expense-category-' || gen_random_uuid()::text,
      actor.organization_id,
      btrim(category_name),
      upper(category_color_hex),
      (select auth.uid())
    )
    returning * into result;
  else
    update public.expense_categories
    set name = btrim(category_name),
        color_hex = upper(category_color_hex)
    where organization_id = actor.organization_id
      and id = target_category_id
    returning * into result;
    if result.id is null then raise exception 'EXPENSE_CATEGORY_NOT_FOUND'; end if;
  end if;

  insert into public.activity_logs (
    organization_id, actor_user_id, actor_name, actor_email, action, category,
    target_type, target_id, description, metadata, source
  )
  select
    actor.organization_id, (select auth.uid()),
    coalesce(nullif(profile.full_name, ''), 'Team Member'), profile.email,
    case when target_category_id is null
      then 'Expense category created' else 'Expense category edited' end,
    'Expenses', 'expense category', result.id,
    case when target_category_id is null
      then 'Created an expense category.' else 'Updated an expense category.' end,
    jsonb_build_object('name', result.name), 'expense-categories'
  from public.profiles profile
  where profile.user_id = (select auth.uid());

  return result;
exception
  when unique_violation then
    raise exception 'EXPENSE_CATEGORY_DUPLICATE';
end;
$$;

create or replace function public.remove_expense_category(
  target_category_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  category_record public.expense_categories;
  removal_result text;
begin
  if actor.id is null or not private.can_module(actor, 'Expenses', 'delete') then
    raise exception 'EXPENSE_CATEGORY_FORBIDDEN';
  end if;
  select * into category_record
  from public.expense_categories
  where organization_id = actor.organization_id and id = target_category_id
  for update;
  if category_record.id is null then raise exception 'EXPENSE_CATEGORY_NOT_FOUND'; end if;

  if exists (
    select 1 from public.expenses
    where organization_id = actor.organization_id
      and category_id = category_record.id
  ) then
    update public.expense_categories
    set status = 'archived'
    where organization_id = actor.organization_id
      and id = category_record.id;
    removal_result := 'archived';
  else
    delete from public.expense_categories
    where organization_id = actor.organization_id
      and id = category_record.id;
    removal_result := 'deleted';
  end if;

  insert into public.activity_logs (
    organization_id, actor_user_id, actor_name, actor_email, action, category,
    target_type, target_id, description, metadata, source
  )
  select
    actor.organization_id, (select auth.uid()),
    coalesce(nullif(profile.full_name, ''), 'Team Member'), profile.email,
    case when removal_result = 'archived'
      then 'Expense category archived' else 'Expense category deleted' end,
    'Expenses', 'expense category', category_record.id,
    case when removal_result = 'archived'
      then 'Archived an expense category.' else 'Deleted an expense category.' end,
    jsonb_build_object('name', category_record.name), 'expense-categories'
  from public.profiles profile
  where profile.user_id = (select auth.uid());

  return removal_result;
end;
$$;

create or replace function public.upsert_expense(
  target_expense_id uuid,
  target_category_id text,
  target_branch_id uuid,
  target_description text,
  target_amount_bhd numeric,
  target_input_vat_bhd numeric,
  target_vat_treatment public.expense_vat_treatment,
  target_incurred_on date,
  target_payment_method public.payment_method,
  target_reference_number text,
  target_notes text,
  target_submission_id text
)
returns public.expenses
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  current_record public.expenses;
  result public.expenses;
  permission_action text := case
    when target_expense_id is null then 'create' else 'edit'
  end;
begin
  if actor.id is null
    or not private.can_module(actor, 'Expenses', permission_action) then
    raise exception 'EXPENSE_FORBIDDEN';
  end if;

  if target_expense_id is null then
    select * into result
    from public.expenses
    where organization_id = actor.organization_id
      and submission_id = btrim(coalesce(target_submission_id, ''));
    if result.id is not null then return result; end if;
  else
    select * into current_record
    from public.expenses
    where organization_id = actor.organization_id
      and id = target_expense_id
      and deleted_at is null
    for update;
    if current_record.id is null then raise exception 'EXPENSE_NOT_FOUND'; end if;
  end if;

  if target_amount_bhd is null or round(target_amount_bhd, 3) <= 0
    or target_input_vat_bhd is null or round(target_input_vat_bhd, 3) < 0
    or round(target_input_vat_bhd, 3) > round(target_amount_bhd, 3)
    or target_incurred_on is null
    or target_vat_treatment is null
    or target_payment_method is null
    or char_length(coalesce(target_description, '')) > 500
    or char_length(coalesce(target_reference_number, '')) > 160
    or char_length(coalesce(target_notes, '')) > 2000
    or (
      target_expense_id is null
      and char_length(btrim(coalesce(target_submission_id, '')))
        not between 8 and 200
    )
    or (
      target_vat_treatment = 'no_vat'
      and round(target_input_vat_bhd, 3) <> 0
    ) then raise exception 'EXPENSE_INVALID'; end if;

  if not exists (
    select 1
    from public.expense_categories category
    where category.organization_id = actor.organization_id
      and category.id = target_category_id
      and (
        category.status = 'active'
        or category.id = current_record.category_id
      )
  ) then raise exception 'EXPENSE_CATEGORY_INVALID'; end if;
  if not exists (
    select 1
    from public.branches branch
    where branch.organization_id = actor.organization_id
      and branch.id = target_branch_id
      and (
        branch.status = 'active'
        or branch.id = current_record.branch_id
      )
  ) then raise exception 'EXPENSE_BRANCH_INVALID'; end if;

  if target_expense_id is null then
    insert into public.expenses (
      organization_id, category_id, branch_id, description, amount_bhd,
      input_vat_bhd, vat_treatment, incurred_on, payment_method,
      reference_number, notes, submission_id, created_by
    ) values (
      actor.organization_id, target_category_id, target_branch_id,
      btrim(coalesce(target_description, '')), round(target_amount_bhd, 3),
      round(target_input_vat_bhd, 3), target_vat_treatment, target_incurred_on,
      target_payment_method, btrim(coalesce(target_reference_number, '')),
      btrim(coalesce(target_notes, '')), btrim(target_submission_id),
      (select auth.uid())
    )
    returning * into result;
  else
    update public.expenses
    set category_id = target_category_id,
        branch_id = target_branch_id,
        description = btrim(coalesce(target_description, '')),
        amount_bhd = round(target_amount_bhd, 3),
        input_vat_bhd = round(target_input_vat_bhd, 3),
        vat_treatment = target_vat_treatment,
        incurred_on = target_incurred_on,
        payment_method = target_payment_method,
        reference_number = btrim(coalesce(target_reference_number, '')),
        notes = btrim(coalesce(target_notes, ''))
    where organization_id = actor.organization_id
      and id = target_expense_id
      and deleted_at is null
    returning * into result;
  end if;

  insert into public.activity_logs (
    organization_id, actor_user_id, actor_name, actor_email, action, category,
    target_type, target_id, description, metadata, old_values, new_values, source
  )
  select
    actor.organization_id, (select auth.uid()),
    coalesce(nullif(profile.full_name, ''), 'Team Member'), profile.email,
    case when target_expense_id is null
      then 'Expense created' else 'Expense edited' end,
    'Expenses', 'expense', result.id::text,
    case when target_expense_id is null
      then 'Created an expense record.' else 'Updated an expense record.' end,
    jsonb_build_object(
      'categoryId', result.category_id,
      'branchId', result.branch_id,
      'amountBhd', result.amount_bhd
    ),
    case when target_expense_id is null then null else jsonb_build_object(
      'categoryId', current_record.category_id,
      'amountBhd', current_record.amount_bhd,
      'incurredOn', current_record.incurred_on
    ) end,
    jsonb_build_object(
      'categoryId', result.category_id,
      'amountBhd', result.amount_bhd,
      'incurredOn', result.incurred_on
    ),
    'expenses'
  from public.profiles profile
  where profile.user_id = (select auth.uid());

  return result;
exception
  when unique_violation then
    select * into result
    from public.expenses
    where organization_id = actor.organization_id
      and submission_id = btrim(coalesce(target_submission_id, ''));
    if target_expense_id is null and result.id is not null then return result; end if;
    raise;
end;
$$;

create or replace function public.delete_expense(target_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_members := private.current_active_membership();
  expense_record public.expenses;
begin
  if actor.id is null or not private.can_module(actor, 'Expenses', 'delete') then
    raise exception 'EXPENSE_FORBIDDEN';
  end if;
  update public.expenses
  set deleted_at = now(), deleted_by = (select auth.uid())
  where organization_id = actor.organization_id
    and id = target_expense_id
    and deleted_at is null
  returning * into expense_record;
  if expense_record.id is null then raise exception 'EXPENSE_NOT_FOUND'; end if;

  insert into public.activity_logs (
    organization_id, actor_user_id, actor_name, actor_email, action, category,
    target_type, target_id, description, metadata, old_values, source
  )
  select
    actor.organization_id, (select auth.uid()),
    coalesce(nullif(profile.full_name, ''), 'Team Member'), profile.email,
    'Expense deleted', 'Expenses', 'expense', expense_record.id::text,
    'Removed an expense from active finance reports.',
    jsonb_build_object(
      'categoryId', expense_record.category_id,
      'branchId', expense_record.branch_id,
      'amountBhd', expense_record.amount_bhd
    ),
    jsonb_build_object(
      'amountBhd', expense_record.amount_bhd,
      'incurredOn', expense_record.incurred_on
    ),
    'expenses'
  from public.profiles profile
  where profile.user_id = (select auth.uid());
end;
$$;

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

create policy "members can view expense categories"
on public.expense_categories for select to authenticated
using (
  private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Expenses', 'view'))
);

create policy "members can view active expenses"
on public.expenses for select to authenticated
using (
  deleted_at is null
  and private.is_active_organization_member(organization_id)
  and (select public.has_module_permission('Expenses', 'view'))
);

revoke all on table public.expense_categories from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
grant select on table public.expense_categories to authenticated;
grant select on table public.expenses to authenticated;

revoke all on function public.upsert_expense_category(text, text, text)
  from public;
revoke all on function public.remove_expense_category(text) from public;
revoke all on function public.upsert_expense(
  uuid, text, uuid, text, numeric, numeric, public.expense_vat_treatment,
  date, public.payment_method, text, text, text
) from public;
revoke all on function public.delete_expense(uuid) from public;

grant execute on function public.upsert_expense_category(text, text, text)
  to authenticated;
grant execute on function public.remove_expense_category(text)
  to authenticated;
grant execute on function public.upsert_expense(
  uuid, text, uuid, text, numeric, numeric, public.expense_vat_treatment,
  date, public.payment_method, text, text, text
) to authenticated;
grant execute on function public.delete_expense(uuid) to authenticated;

comment on table public.expenses is
  'Tenant-isolated BHD expense records. Deleted rows are retained for audit but excluded from application reports.';
comment on column public.expenses.submission_id is
  'Client-generated idempotency key used to prevent duplicate expense creation.';
