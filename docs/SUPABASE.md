# Slotova Supabase foundation

Phase 1 connects Supabase Auth and creates the tenant foundation. Appointments,
customers, invoices, expenses, services, and settings still use their existing
mock services until later phases.

## Requirements

- Node.js 22 or newer
- Docker Desktop for the local Supabase stack
- A hosted Supabase project for deployment

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Run `npm install`.
3. Run `npm run supabase:start`.
4. Copy the local API URL and publishable key printed by the CLI into
   `.env.local`.
5. Run `npm run supabase:reset` to apply migrations and local-only seed data.
6. Run `npm run dev`.

The local seed owner is `owner@slotova.local` with password
`SlotovaDemo123!`. Never use this account or seed file in a hosted project.

## Hosted setup

1. Create or select a Supabase project.
2. Run `npx supabase link --project-ref <project-ref>`.
3. Review the migration, then run `npx supabase db push`. Do not run
   `supabase/seed.sql` against the hosted project.
4. Add the hosted project URL and publishable key to the deployment
   environment. Never expose a secret or service-role key through a
   `NEXT_PUBLIC_` variable.
5. In Auth URL Configuration, set the production Site URL and allow
   `https://<your-domain>/auth/confirm`.
6. If email confirmation is enabled, change the confirmation template link to:

   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

7. Run `npm run supabase:advisors` after linking and fix all security findings.
8. Generate authoritative types from the applied schema with
   `npx supabase gen types typescript --linked > src/types/database.ts`.

The migration explicitly grants authenticated Data API access and enables RLS.
If the Data API exposure settings are customized, confirm that `public` is
exposed and keep RLS enabled.

## Verification

- `npm run supabase:test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verify signup, optional email confirmation, sign in, refresh, sign out, and
protected-route redirects. Create two owners and confirm neither can query the
other organization's records.
