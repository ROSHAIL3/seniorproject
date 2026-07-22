# Beauty & Wellness Business Management Platform

This repository contains a senior project focused on designing and developing a responsive management platform for the beauty and wellness industry. It provides businesses with one place to manage appointments, customers, team members, locations, services, invoices, expenses, schedules, and operational settings.

The idea is intentionally broader than one business or one type of establishment. It can support beauty salons, barbershops, spas, wellness centers, massage studios, nail studios, skincare businesses, and independent beauty or wellness professionals. The interface is based on the TailAdmin Free Next.js dashboard and has been adapted for this industry using the existing TailAdmin components and layout system.

## Senior Project Scope

This is an academic senior project and a functional software prototype. It demonstrates requirements analysis, user-interface design, reusable component development, business-rule validation, shared data modeling, and preparation for a production backend. It is not currently a commercial production system.

## Project Goals

The application is designed to support the daily operation of beauty and wellness businesses:

- Schedule appointments without staff, branch, or customer conflicts
- Maintain customer profiles and custom information fields
- Manage team members, roles, permissions, schedules, branches, and services
- Track invoices, expenses, tax settings, and business reports
- Review appointments through list, schedule, and calendar views
- Keep the application architecture ready for Supabase authentication and persistence

## Current Features

### Dashboard

- Business summary cards
- Upcoming appointments
- Recent invoices
- Monthly expenses
- Top services and daily appointment overview
- Loading and empty states

### Appointments and Calendar

- Create and edit appointments
- Customer, service, staff, branch, date, and time selection
- Business-hours, staff-break, day-off, service, branch, and overlap validation
- Appointment list filters and detail pages
- Appointment notes and activity history
- Month, week, and day calendar views
- Calendar filtering by active staff member

### Customers

- Searchable customer cards
- Customer creation and editing
- Customer detail pages and profile photos
- Custom customer fields
- Loading, empty, and error states

### Team Members

- Search by name, email, phone, or role
- Responsive member cards, result count, and pagination
- Profile photo or initials, role, status, branch, and contact details
- Invitation-based member creation with no manually entered password
- Full name, email, and phone validation
- Duplicate email prevention
- Branch and service assignments
- Profile editing and activation controls
- Created and last-active dates
- Configurable View, Create, Edit, and Delete permissions for each application module
- Owner protections: automatic permissions, immutable permission flags, no deactivation, and at least one required Owner
- Inactive members are excluded from new appointments while historical appointments remain available

Invitation sending is currently simulated. The service boundary is intentionally structured so it can later call Supabase Auth invitation APIs without changing the page components.

### Business and Finance

- Branch management with main-branch safeguards
- Organization profile settings
- Appointment and staff schedule settings
- VAT configuration and invoice calculations
- Invoice lists and invoice details
- Expense records, categories, filters, and summaries
- Dashboard and reports derived from shared business data

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- FullCalendar
- ApexCharts
- TailAdmin Free Next.js components

## Running Locally

### Requirements

- Node.js 20 or later
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

### Verification

```bash
npm run lint
npm run build
```

### Production

```bash
npm run build
npm start
```

## Application Structure

```text
src/
├── app/          # Next.js routes, route loading states, and error boundaries
├── components/   # Reusable TailAdmin-based feature and UI components
├── data/mock/    # Seed data used by the current prototype
├── hooks/        # Shared client-side feature hooks
├── lib/          # Formatting, validation, and permission logic
├── services/     # Data-access and business-rule boundaries
└── types/        # Shared domain models and input types
```

Page components are kept focused on rendering and interaction. Validation, owner safeguards, appointment eligibility, and permission logic live outside the pages in services or shared helpers.

## Data and Architecture

The current version is a front-end prototype backed by typed mock data and in-memory service stores. Data can reset after a refresh or development-server restart; it should not yet be treated as production persistence.

Stable IDs connect shared records across the application:

- Team members connect to staff schedules, services, branches, appointments, and calendar filters
- Customers connect to appointments and invoices
- Appointments connect customers, team members, services, branches, and activity history
- Finance and dashboard views reuse the same service data rather than page-specific copies

The Team Member model is the canonical source for member identity, role, status, permissions, branch, and assigned services. The legacy staff service acts only as a compatibility adapter for appointment and calendar components.

## Planned Supabase Integration

The next backend phase can replace the in-memory service implementations while preserving the current component APIs:

1. Store domain records in Supabase Postgres.
2. Use Supabase Auth invitations for team-member onboarding.
3. Link each team member to an Auth user through a stable user ID.
4. Enforce active status and role permissions with middleware, Row Level Security, and server-side authorization.
5. Store profile photos in Supabase Storage.
6. Add real-time updates where appointment and schedule changes require them.
7. Record invitation, sign-in, and last-active timestamps from actual authentication events.

Client-side permission controls are a user-interface convenience only. Production authorization must also be enforced on the server and through database policies.

## Important Business Rules

- Full name and email are required for every team member.
- Team-member email addresses must be unique.
- Owners always have every permission.
- Owner permissions cannot be edited.
- An Owner cannot be deactivated or removed if doing so would leave no Owner.
- Inactive team members cannot sign in or receive new appointments.
- Deactivation never removes existing appointment history.
- Archived or inactive business records remain available where historical references require them.

## Template Attribution

This senior project uses the [TailAdmin Free Next.js Admin Dashboard](https://github.com/TailAdmin/free-nextjs-admin-dashboard) as its interface foundation. TailAdmin components have been retained and extended for the beauty and wellness management use case.

## License

The TailAdmin Free template is distributed under the MIT License. See [LICENSE](./LICENSE) for the repository license text.
