-- Cover the request decision actor foreign key for user maintenance operations.
create index appointments_request_decided_by_idx
  on public.appointments (request_decided_by)
  where request_decided_by is not null;
