-- PostgreSQL resolves an untyped CASE expression as text before the INSERT
-- target supplies enum context. Patch the immediately preceding function
-- definition while keeping the applied migration immutable.
do $$
declare
  current_definition text;
  repaired_definition text;
  untyped_expression text :=
    'case when organization.booking_auto_confirm then ''confirmed'' else ''booked'' end,';
  typed_expression text :=
    '(case when organization.booking_auto_confirm then ''confirmed'' else ''booked'' end)::public.appointment_status,';
begin
  select pg_get_functiondef(
    'booking_private.create_public_booking(text,uuid,text,text,timestamptz,text,text,text,text,jsonb,jsonb,uuid,text)'::regprocedure
  ) into current_definition;

  repaired_definition := replace(
    current_definition,
    untyped_expression,
    typed_expression
  );
  if repaired_definition = current_definition then
    raise exception 'PUBLIC_BOOKING_STATUS_CAST_PATCH_NOT_APPLIED';
  end if;
  execute repaired_definition;
end;
$$;

comment on function booking_private.create_public_booking(
  text, uuid, text, text, timestamptz, text, text, text, text,
  jsonb, jsonb, uuid, text
) is
  'Creates idempotent service/package bookings with an enum-safe initial status selected from tenant auto-confirm settings.';
