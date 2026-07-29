# Slotova Supabase foundation

Phase 1 connects Supabase Auth and creates the tenant foundation. Phase 2 stores
organization settings, private organization logos, and branches. Phase 3 stores
team memberships, roles, permissions, staff schedules, time off, and persistent
activity logs. Phase 4 stores service categories, services, packages, prices,
durations, branch availability, and staff assignments. Phase 5 stores
customers, weekly business hours, appointments, notes, status history, and
booking-field answers. Invoices and expenses remain mocked.

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
   Add `SUPABASE_SECRET_KEY` only to the server environment for invitation and
   recovery-link generation. Never expose a secret or service-role key through
   a `NEXT_PUBLIC_` variable.
6. In Auth URL Configuration, set the production Site URL and allow
   `https://<your-domain>/auth/confirm` and
   `https://<your-domain>/set-password`.
7. If email confirmation is enabled, change the confirmation template link to:

   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

8. Run `npm run supabase:advisors` after linking and fix all security findings.
9. Generate authoritative types from the applied schema with
   `npx supabase gen types typescript --linked > src/types/database.ts`.

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

## Free usage monitoring

Check the Supabase Dashboard usage page before and after each hosted migration.
Pay particular attention to database size, Storage size, egress, cached egress,
and monthly active users. If a feature would require a paid capability, stop
and review it before enabling anything.

## Recommended Phase 6

Migrate finance next: invoices, immutable invoice-item snapshots, appointment
payment allocation, VAT snapshots, payment history, and safe invoice numbering.
Persist customer custom-field definitions and service booking-field definitions
before permanently linking those definitions to finance records. Keep receipts
database-only at first; file uploads, online payment providers, automatic email,
and scheduled reminders can add storage, egress, or third-party cost and must be
reviewed before enabling them.
