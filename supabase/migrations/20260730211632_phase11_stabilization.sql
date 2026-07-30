-- Phase 11 is a stabilization-only migration. It adds no product features.
-- The indexes cover existing foreign keys reported by the Supabase advisor,
-- and the conditional revoke closes an exposed helper found on hosted projects.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute
      'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

create index if not exists activity_logs_actor_user_fk
  on public.activity_logs (actor_user_id);
create index if not exists appointment_notes_created_by_fk
  on public.appointment_notes (created_by);
create index if not exists reschedule_requests_proposed_membership_fk
  on public.appointment_reschedule_requests (
    organization_id,
    proposed_membership_id
  );
create index if not exists reschedule_requests_resolved_by_fk
  on public.appointment_reschedule_requests (resolved_by);
create index if not exists appointment_status_history_changed_by_fk
  on public.appointment_status_history (changed_by);
create index if not exists appointments_created_by_fk
  on public.appointments (created_by);
create index if not exists appointments_organization_branch_fk
  on public.appointments (organization_id, branch_id);
create index if not exists appointments_organization_package_fk
  on public.appointments (organization_id, package_id)
  where package_id is not null;
create index if not exists appointments_organization_service_fk
  on public.appointments (organization_id, service_id)
  where service_id is not null;
create index if not exists customers_created_by_fk
  on public.customers (created_by);
create index if not exists expense_categories_created_by_fk
  on public.expense_categories (created_by);
create index if not exists expenses_created_by_fk
  on public.expenses (created_by);
create index if not exists expenses_deleted_by_fk
  on public.expenses (deleted_by);
create index if not exists invoices_created_by_fk
  on public.invoices (created_by);
create index if not exists notification_preferences_user_fk
  on public.notification_preferences (user_id);
create index if not exists notifications_recipient_user_fk
  on public.notifications (recipient_user_id);
create index if not exists organization_members_created_by_fk
  on public.organization_members (created_by);
create index if not exists organizations_created_by_fk
  on public.organizations (created_by);
create index if not exists payment_transactions_recorded_by_fk
  on public.payment_transactions (recorded_by);
create index if not exists staff_time_off_created_by_fk
  on public.staff_time_off (created_by);
