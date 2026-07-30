begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

select ok(
  to_regclass('public.appointments_organization_branch_fk') is not null,
  'appointment branch foreign keys are indexed'
);
select ok(
  to_regclass('public.appointments_organization_service_fk') is not null,
  'appointment service foreign keys are indexed'
);
select ok(
  to_regclass('public.reschedule_requests_proposed_membership_fk') is not null,
  'reschedule proposed membership foreign keys are indexed'
);
select ok(
  to_regclass('public.notifications_recipient_user_fk') is not null,
  'notification recipient foreign keys are indexed'
);
select ok(
  to_regclass('public.activity_logs_actor_user_fk') is not null,
  'activity actor foreign keys are indexed'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.organization_booking_counters',
    'SELECT'
  ),
  'booking counters remain inaccessible to authenticated clients'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.organization_finance_counters',
    'SELECT'
  ),
  'finance counters remain inaccessible to authenticated clients'
);
select ok(
  to_regprocedure('public.rls_auto_enable()') is null
    or not has_function_privilege(
      'anon',
      'public.rls_auto_enable()',
      'EXECUTE'
    ),
  'anonymous clients cannot execute the RLS helper when it exists'
);

select * from finish();
rollback;
