# Slotova Supabase foundation

Phase 1 connects Supabase Auth and creates the tenant foundation. Phase 2 stores
organization settings, private organization logos, and branches. Phase 3 stores
team memberships, roles, permissions, staff schedules, time off, and persistent
activity logs. Phase 4 stores service categories, services, packages, prices,
durations, branch availability, and staff assignments. Phase 5 stores
customers, weekly business hours, appointments, notes, status history, and
booking-field answers. Phase 6 stores customer/service field definitions,
organization VAT settings,
immutable invoice and line-item snapshots, append-only payments/refunds, and
payment allocations. Phase 7 stores expense categories, branch-linked expenses,
input VAT, idempotent submissions, soft deletion, and persistent audit entries.

## Free Plan guardrails

Slotova is designed to stay within the Supabase Free Plan:

- Use one hosted project and the local Docker stack for development.
- Do not enable database branching, SMS authentication, image transformations,
  paid compute, or other paid add-ons.
- The hosted project has a shared 500 MB database quota and enters read-only
  mode if that quota is exceeded.
- The hosted project has 1 GB shared file storage. Slotova accepts one current
  organization logo per tenant, limited to 2 MB.
- Logos are served directly with one-hour signed URLs. No paid image
  transformations are requested.
- Free projects may pause after one week without activity.
- Free projects do not include automatic database backups or point-in-time
  recovery.

Review the current limits before every hosted rollout because plan quotas can
change:

- <https://supabase.com/pricing>
- <https://supabase.com/docs/guides/platform/database-size>

## Requirements

- Node.js 22 or newer
- Docker Desktop for the local Supabase stack
- A hosted Supabase project for deployment

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Run `npm install`.
3. Run `npm run supabase:start`.
4. Copy the local API URL and publishable key printed by the CLI into
   `.env.local`, and set `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
5. Run `npm run supabase:reset` to apply migrations and local-only seed data.
6. Run `npm run dev`.

The local seed owner is `owner@slotova.local` with password
`SlotovaDemo123!`. Never use this account or seed file in a hosted project.

## Hosted setup

1. Create or select a single Supabase Free project.
2. Create a manual database backup as described below.
3. Run `npx supabase link --project-ref <project-ref>`.
4. Review the migrations, then run `npx supabase db push`. Do not run
   `supabase/seed.sql` against the hosted project.
5. Add the hosted project URL, publishable key, and
   `NEXT_PUBLIC_APP_URL=https://<your-domain>` to the deployment environment.
   Add `SUPABASE_SECRET_KEY` only to the server environment for invitation,
   recovery-link, private-logo signing, and public-booking transaction
   generation. Add a long random `PUBLIC_BOOKING_RATE_LIMIT_SECRET` for request
   fingerprint hashing, or the server will safely reuse `SUPABASE_SECRET_KEY`.
   Never expose either secret or a service-role key through a `NEXT_PUBLIC_`
   variable.
6. In Auth URL Configuration, set the production Site URL and allow
   `https://<your-domain>/auth/confirm` and
   `https://<your-domain>/set-password`.
7. If email confirmation is enabled, change the confirmation template link to:

   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

8. Run `npm run supabase:advisors` after linking and fix all security findings.
9. Generate authoritative types from the applied schema with
   `npx supabase gen types typescript --linked > src/types/database.ts`.

### Google OAuth setup

Email/password authentication remains enabled. Google is an additional sign-in
option and its secret belongs in Google/Supabase configuration, never in a
`NEXT_PUBLIC_` environment variable.

1. In Google Auth Platform, create a Web application OAuth client.
2. Configure the `openid`, email, and profile scopes.
3. Add the application origins, including `http://localhost:3000` for local
   testing and the production HTTPS origin.
4. Add the Supabase callback shown on the Google provider page as an authorized
   redirect URI. Hosted projects normally use
   `https://<project-ref>.supabase.co/auth/v1/callback`; local Supabase uses
   `http://127.0.0.1:54321/auth/v1/callback`.
5. In Supabase Dashboard → Authentication → Providers → Google, enable Google
   and enter the Google Client ID and Client Secret.
6. In Supabase Auth URL Configuration, keep the production Site URL and allow
   `https://<your-domain>/auth/confirm`. The local callback is already listed in
   `supabase/config.toml`.
7. Disable both Twitter and X providers in the Supabase Dashboard. Slotova no
   longer exposes either authentication option.

For optional local Google-provider testing, use the commented
`[auth.external.google]` example in `supabase/config.toml` and provide
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` only in a local, uncommitted
environment file.

The migrations explicitly grant authenticated Data API access and enable RLS.
If the Data API exposure settings are customized, confirm that `public` is
exposed and keep RLS enabled.

## Manual backup before hosted migrations

The Free Plan has no automatic backups. Before an important hosted migration,
create a logical backup:

```bash
npx supabase db dump --linked -f slotova-before-migration.sql
```

Keep backup files outside the repository and verify that the output is not
empty. Never commit a database dump because it may contain private data.

## Verification

Run:

```bash
npm run supabase:test
npm run supabase:advisors
npm run lint
npm run typecheck
npm run build
```

Verify signup, optional email confirmation, sign in, refresh, sign out, and
protected-route redirects. Create two owners and confirm neither can query the
other organization's records or logo objects.

For Phase 2, also verify:

- Owners and admins can update organization settings and logos.
- Managers can manage branches but cannot change organization settings.
- Staff can read organization and branch data but cannot mutate it.
- The first branch is main, only one active branch is main, and the main branch
  cannot be demoted, disabled, archived, or deleted without reassignment.
- Branch names are unique per organization without case sensitivity.
- Business email is verified only when it matches the authenticated user's
  confirmed login email.
- Organization deletion requires the exact name, signs the owner out, and
  blocks access without destroying retained data.

For Phase 3, also verify:

- Owners and admins can create invitation links; other roles need the explicit
  Team Members `create` permission.
- New members remain `invited` until the secure link is accepted.
- Invitation and recovery links lead to the password-setting page.
- Disabling a member blocks future application access while retaining history.
- Roles and module permissions are enforced by database functions and RLS, not
  browser-editable Auth metadata.
- Staff schedules and time-off rows cannot reference a member in another
  organization.
- Activity logs are persistent, append-only to application users, and isolated
  by organization.

## Free invitation workflow

Phase 3 uses `auth.admin.generateLink` with the server-only secret key. It does
not send email. An Owner or Admin copies the generated invitation or recovery
link and shares it securely. This avoids requiring a paid email provider.

Supabase's default SMTP service is intended for testing, is best-effort, and is
rate limited. Do not depend on it for production invitations. Custom SMTP can
introduce a separately priced provider, so review cost before enabling it.
Team-member and catalog image uploads remain disabled to conserve the Free
storage quota; organization logos remain the only uploaded files in this phase.
Static application images can still be displayed, but base64 image data is
never persisted in catalog database columns.

For Phase 4, also verify:

- Categories, services, packages, and package items are isolated by organization.
- Service and category names are unique within their intended tenant scope.
- Service prices use three-decimal BHD precision and durations are bounded.
- Package items reference services in the same organization.
- Package price rules are rechecked inside the transaction, not only in the UI.
- Service-to-branch and service-to-staff assignments cannot cross organizations.
- Empty branch selection defaults a service to every active branch.
- Catalog mutations honor trusted `Services` module permissions.
- Historical appointment snapshots remain readable if a catalog item is later archived.

For Phase 5, also verify:

- Customer phone numbers and non-empty emails are unique inside an organization.
- Customer custom-field answers are tenant-scoped and capped at 32 KB per customer.
- Business-hour changes persist and are used by database booking validation.
- Appointment duration exactly matches the selected service or package duration.
- The staff member, customer, branch, service/package, and all assignments belong
  to the active organization.
- Bookings cannot overlap business breaks, staff breaks, staff time off, staff
  hours, another staff booking, or another booking for the same customer.
- Concurrent requests for the same staff member or customer are serialized with
  transaction-level advisory locks acquired in consistent order.
- Cancelling an appointment releases its slot; deleting requires the trusted
  Appointments `delete` permission.
- Appointment notes and status history are persistent and tenant-isolated.
- Customer photos remain disabled to avoid consuming Free storage.

For Phase 6, also verify:

- Customer and service booking-field definitions, dropdown options, and required
  answers are validated again inside PostgreSQL.
- Finance settings and every invoice-owned table are isolated by organization.
- Invoice numbers are allocated under a transaction-level advisory lock.
- One appointment cannot be invoiced twice, and multi-appointment invoices
  require one customer.
- Invoice item, customer, and VAT values remain immutable snapshots even when
  their source records change later.
- Payments and refunds are append-only, idempotent, allocated to invoice items,
  and cannot exceed the outstanding or paid amount.
- Creating or updating an advance payment creates a transaction instead of
  overwriting payment history.
- Email delivery is intentionally not connected. Use Print / Save as PDF and
  send manually.
- Receipts remain disabled; no receipt files, payment gateway,
  scheduled reminders, SMS, or paid provider is enabled.

For Phase 7, also verify:

- Expense categories and expenses are isolated by organization and require
  trusted Expenses module permissions.
- Expenses reference a category and branch in the same organization.
- BHD amounts and input VAT retain three-decimal precision.
- Submission IDs make repeated create requests idempotent.
- Used categories are archived instead of deleted.
- Expense deletion is soft, retained for audit, and excluded from active
  reports.
- Revenue, VAT, profit/loss, customer, staff, service, and busy-hour reports use
  persisted backend sources.
- Receipt uploads remain disabled to avoid storing base64 data or consuming the
  Free storage quota.
- Email/password signup and sign-in still work, Google OAuth completes through
  `/auth/confirm`, and Twitter/X buttons and providers are disabled.

For Phase 8, also verify:

- Every enabled organization has a unique `/book/<slug>` URL, while disabled,
  suspended, deleted, and unknown organizations return no public catalog.
- The public response contains only active branches, categories, services,
  assigned staff display names, required service questions, and safe
  organization branding.
- Anonymous visitors cannot query customers, appointments, activity logs,
  rate-limit rows, or execute the booking-write RPC directly.
- Availability honors business hours, business breaks, staff custom hours,
  staff breaks, approved time off, service-to-branch assignments,
  service-to-staff assignments, existing appointments, same-day settings, and
  the 90-day booking window.
- The final write rechecks availability under transaction-level locks, creates
  or reuses a tenant-scoped customer, validates service answers in PostgreSQL,
  and records the correct branch, service, staff, duration, price, source, and
  pending/confirmed status.
- Repeating the same browser submission ID returns the existing booking instead
  of creating a duplicate. Concurrent attempts for the same staff slot cannot
  both succeed.
- Request fingerprints are HMAC hashed on the server. The short-lived database
  counters allow at most 10 attempts per fingerprint per 15 minutes and five
  per normalized phone per organization per hour.
- The opaque confirmation token returns only the booking summary and cannot be
  reused with another organization slug.
- Organization booking settings now persist instead of using in-memory general
  settings.
- Public booking sends no email or SMS, uses no paid CAPTCHA, creates no Storage
  objects, and enables no paid Supabase feature.

## Free usage monitoring

Check the Supabase Dashboard usage page before and after each hosted migration.
Pay particular attention to database size, Storage size, egress, cached egress,
and monthly active users. If a feature would require a paid capability, stop
and review it before enabling anything.

## Recommended Phase 9

Add free-plan-safe customer self-service and appointment-request operations:
let customers reopen an opaque booking link to view status, cancel within the
saved notice period, or request a reschedule; add clear pending-request counts
and approve/reject actions for owners; and persist every public status change
in appointment history and the activity log. Keep communication manual with
copyable message templates first. Do not enable automated email, SMS, scheduled
jobs, or paid CAPTCHA until their current Supabase and provider costs are
reviewed.

Receipt uploads should remain deferred. If they are later requested, review the
current Free storage and egress quotas before creating a private bucket. Do not
enable OCR or image transformations without confirming cost first.
