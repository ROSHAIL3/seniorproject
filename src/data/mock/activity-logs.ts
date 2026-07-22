import type { ActivityLog } from "@/types/activity-log";

export const mockActivityLogs: ActivityLog[] = [
  {
    id: "activity-log-001", action: "Signed in", category: "Account",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    description: "Successful account sign-in.", metadata: {}, ipAddress: "127.0.0.1", source: "web",
    occurredAt: "2026-07-20T08:42:00.000Z",
  },
  {
    id: "activity-log-002", action: "Team member invited", category: "Catalog & Team",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    targetType: "team member", targetId: "staff-daniel", description: "Invited Daniel Lee as Receptionist.",
    metadata: { email: "daniel@seniorproject.test", branch: "Lena Manama" }, source: "team-members",
    newValues: { role: "Receptionist", status: "Invited" }, occurredAt: "2026-07-20T08:15:00.000Z",
  },
  {
    id: "activity-log-003", action: "Appointment confirmed", category: "Customers & Appointments",
    actorId: "staff-james", actorName: "James Carter", actorEmail: "james@seniorproject.test",
    targetType: "appointment", targetId: "appointment-2", description: "Confirmed appointment BK-000005.",
    metadata: { customer: "Noor Hassan", service: "Deep Tissue Massage", staff: "James Carter", branch: "Lena Manama" },
    oldValues: { status: "Booked" }, newValues: { status: "Confirmed" }, source: "appointments",
    occurredAt: "2026-07-19T15:30:00.000Z",
  },
  {
    id: "activity-log-004", action: "Customer updated", category: "Customers & Appointments",
    actorId: "staff-daniel", actorName: "Daniel Lee", actorEmail: "daniel@seniorproject.test",
    targetType: "customer", targetId: "customer-2", description: "Updated customer contact information.",
    metadata: { customer: "Noor Hassan" }, oldValues: { phone: "+973 3900 0101" }, newValues: { phone: "+973 3900 0110" },
    source: "customers", occurredAt: "2026-07-19T11:05:00.000Z",
  },
  {
    id: "activity-log-005", action: "Expense created", category: "Expenses",
    actorId: "staff-james", actorName: "James Carter", actorEmail: "james@seniorproject.test",
    targetType: "expense", targetId: "expense-3", description: "Recorded a new operating expense.",
    metadata: { category: "Supplies", amount: "42.500 BHD", branch: "Lena Manama" }, source: "expenses",
    occurredAt: "2026-07-18T13:20:00.000Z",
  },
  {
    id: "activity-log-006", action: "VAT settings changed", category: "Settings",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    targetType: "appointment settings", targetId: "appointment-settings-primary", description: "Updated VAT configuration.",
    metadata: {}, oldValues: { ratePercent: 5 }, newValues: { ratePercent: 10, type: "Exclusive" }, source: "settings",
    occurredAt: "2026-07-18T09:10:00.000Z",
  },
  {
    id: "activity-log-007", action: "Invoice paid", category: "Finance",
    actorId: "staff-daniel", actorName: "Daniel Lee", actorEmail: "daniel@seniorproject.test",
    targetType: "invoice", targetId: "invoice-2", description: "Invoice payment was completed.",
    metadata: { invoice: "INV-000002", customer: "Aisha Ahmed", amount: "33.000 BHD" }, source: "invoices",
    oldValues: { status: "Unpaid" }, newValues: { status: "Paid" }, occurredAt: "2026-07-17T16:45:00.000Z",
  },
  {
    id: "activity-log-008", action: "Branch renamed", category: "Catalog & Team",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    targetType: "branch", targetId: "branch-manama", description: "Renamed a business branch.", metadata: {},
    oldValues: { name: "Main Branch" }, newValues: { name: "Lena Manama" }, source: "branches",
    occurredAt: "2026-07-17T10:00:00.000Z",
  },
  {
    id: "activity-log-009", action: "Business hours changed", category: "Settings",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    targetType: "business hours", targetId: "appointment-settings-primary", description: "Updated weekly business hours.",
    metadata: { daysChanged: 2 }, source: "appointment-settings", occurredAt: "2026-07-16T12:30:00.000Z",
  },
  {
    id: "activity-log-010", action: "Notification settings changed", category: "Notifications",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    targetType: "notification settings", targetId: "notification-settings-primary", description: "Updated appointment reminder preferences.",
    metadata: { channel: "email" }, source: "notifications", occurredAt: "2026-07-15T14:20:00.000Z",
  },
  {
    id: "activity-log-011", action: "Subscription changed", category: "Billing",
    actorId: "staff-sophia", actorName: "Sophia Bennett", actorEmail: "owner@seniorproject.test",
    targetType: "subscription", targetId: "subscription-primary", description: "Subscription plan information changed.",
    metadata: { plan: "Business" }, source: "billing", occurredAt: "2026-07-14T09:00:00.000Z",
  },
  {
    id: "activity-log-012", action: "Background synchronization completed", category: "System",
    actorId: null, actorName: "System", targetType: "synchronization", targetId: "sync-20260713",
    description: "Shared records were synchronized successfully.", metadata: { records: 24 }, source: "system",
    occurredAt: "2026-07-13T23:30:00.000Z",
  },
];
