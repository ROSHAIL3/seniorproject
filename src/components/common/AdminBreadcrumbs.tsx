"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageBreadcrumb, { type BreadcrumbItem } from "./PageBreadCrumb";
import { getAppointmentByBookingNumber } from "@/services/appointments.service";
import { getCustomerById } from "@/services/customers.service";
import { getPackageById } from "@/services/packages.service";
import { getServiceById } from "@/services/services.service";
import { getTeamMemberById } from "@/services/team-members.service";
import { resolveReturnTo } from "@/lib/navigation";

const reportLabels: Record<string, string> = {
  revenue: "Revenue",
  "vat-return": "VAT Return",
  "profit-loss": "Profit & Loss",
  "top-customers": "Top Customers",
  "staff-performance": "Staff Performance",
  "service-profitability": "Service Profitability",
  "busy-hours": "Busy Hours",
};

const settingsLabels: Record<string, string> = {
  "organization-profile": "Organization Profile",
  branches: "Branches",
  services: "Services",
  packages: "Packages",
  "team-members": "Team Members",
  "appointment-settings": "Appointment Settings",
  "customer-fields": "Customer Fields",
  "expense-categories": "Expense Categories",
  notifications: "Notifications",
  "subscription-billing": "Subscription & Billing",
  "add-ons": "Add-ons",
  "activity-log": "Activity Log",
  version: "Version",
};

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [resolvedLabel, setResolvedLabel] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const editId = searchParams.get("edit");
  const lookupKey = `${pathname}?edit=${editId ?? ""}`;

  useEffect(() => {
    let active = true;

    async function loadLabel() {
      const segments = pathname.split("/").filter(Boolean);
      let label = "";

      if (segments[0] === "appointments" && segments[1]) {
        const bookingNumber =
          segments[1] === "new" ? editId : decodeURIComponent(segments[1]);
        if (bookingNumber) {
          const record = await getAppointmentByBookingNumber(bookingNumber);
          label = record ? `Booking ${record.bookingNumber}` : `Booking ${bookingNumber}`;
        }
      } else if (segments[0] === "customers" && segments[1]) {
        const record = await getCustomerById(decodeURIComponent(segments[1]));
        label = record?.name ?? "Customer";
      } else if (
        segments[0] === "settings" &&
        segments[1] === "services" &&
        segments[2] &&
        segments[2] !== "new"
      ) {
        const record = await getServiceById(decodeURIComponent(segments[2]));
        label = record?.name ?? "Service";
      } else if (
        segments[0] === "settings" &&
        segments[1] === "packages" &&
        segments[2] &&
        segments[2] !== "new"
      ) {
        const record = await getPackageById(decodeURIComponent(segments[2]));
        label = record?.name ?? "Package";
      } else if (
        segments[0] === "settings" &&
        segments[1] === "team-members" &&
        segments[2]
      ) {
        const record = await getTeamMemberById(
          decodeURIComponent(segments[2]),
        );
        label = record?.fullName ?? "Team Member";
      }

      if (active) setResolvedLabel({ key: lookupKey, label });
    }

    void loadLabel();
    return () => {
      active = false;
    };
  }, [editId, lookupKey, pathname]);

  const dynamicLabel =
    resolvedLabel?.key === lookupKey ? resolvedLabel.label : "";
  const items = buildItems(
    pathname,
    editId,
    searchParams.get("returnTo"),
    dynamicLabel,
  );
  return <PageBreadcrumb items={items} showTitle={false} />;
}

function buildItems(
  pathname: string,
  editId: string | null,
  returnTo: string | null,
  dynamicLabel: string,
): BreadcrumbItem[] {
  const dashboard: BreadcrumbItem = { label: "Dashboard", href: "/dashboard" };
  if (pathname === "/dashboard") return [{ label: "Dashboard" }];
  if (pathname === "/calendar")
    return [dashboard, { label: "Calendar" }];
  if (pathname === "/appointments")
    return [dashboard, { label: "Appointments" }];
  if (pathname === "/appointments/new") {
    if (editId) {
      const detailHref = resolveReturnTo(
        returnTo,
        `/appointments/${encodeURIComponent(editId)}`,
      );
      return [
        dashboard,
        { label: "Appointments", href: "/appointments" },
        {
          label: dynamicLabel || `Booking ${editId}`,
          href: detailHref.startsWith("/appointments/")
            ? detailHref
            : `/appointments/${encodeURIComponent(editId)}`,
        },
        { label: "Edit" },
      ];
    }
    return [
      dashboard,
      { label: "Appointments", href: "/appointments" },
      { label: "New Appointment" },
    ];
  }
  if (pathname.startsWith("/appointments/")) {
    const booking = decodeURIComponent(pathname.split("/")[2]);
    return [
      dashboard,
      { label: "Appointments", href: "/appointments" },
      { label: dynamicLabel || `Booking ${booking}` },
    ];
  }
  if (pathname === "/customers")
    return [dashboard, { label: "Customers" }];
  if (pathname.startsWith("/customers/")) {
    return [
      dashboard,
      { label: "Customers", href: "/customers" },
      { label: dynamicLabel || "Customer" },
    ];
  }
  if (pathname === "/invoices")
    return [dashboard, { label: "Invoices" }];
  if (pathname.startsWith("/invoices/")) {
    const number = decodeURIComponent(pathname.split("/")[2]);
    return [
      dashboard,
      { label: "Invoices", href: "/invoices" },
      { label: `Invoice ${number}` },
    ];
  }
  if (pathname === "/expenses")
    return [dashboard, { label: "Expenses" }];
  if (pathname === "/expenses/new") {
    return [
      dashboard,
      { label: "Expenses", href: "/expenses" },
      { label: editId ? "Edit Expense" : "New Expense" },
    ];
  }
  if (pathname === "/reports")
    return [dashboard, { label: "Reports" }];
  if (pathname.startsWith("/reports/")) {
    const slug = pathname.split("/")[2];
    return [
      dashboard,
      { label: "Reports", href: "/reports" },
      { label: reportLabels[slug] ?? titleCase(slug) },
    ];
  }
  if (pathname === "/settings")
    return [dashboard, { label: "Settings" }];
  if (pathname.startsWith("/settings/")) {
    const segments = pathname.split("/").filter(Boolean);
    const section = segments[1];
    const items: BreadcrumbItem[] = [
      dashboard,
      { label: "Settings", href: "/settings" },
    ];

    if (section === "services") {
      items.push({ label: "Services", href: "/settings/services" });
      if (segments[2] === "new") items.push({ label: "New Service" });
      else if (segments[2]) {
        items.push({
          label: dynamicLabel || "Service",
          href:
            segments[3] === "edit"
              ? `/settings/services/${segments[2]}`
              : undefined,
        });
        if (segments[3] === "edit") items.push({ label: "Edit" });
      } else {
        items[items.length - 1] = { label: "Services" };
      }
      return items;
    }

    if (section === "packages") {
      items.push({ label: "Packages", href: "/settings/packages" });
      if (segments[2] === "new") items.push({ label: "New Package" });
      else if (segments[2]) {
        items.push({ label: dynamicLabel || "Package" });
        if (segments[3] === "edit") items.push({ label: "Edit" });
      } else {
        items[items.length - 1] = { label: "Packages" };
      }
      return items;
    }

    if (section === "team-members") {
      items.push({ label: "Team Members", href: "/settings/team-members" });
      if (segments[2]) items.push({ label: dynamicLabel || "Team Member" });
      else items[items.length - 1] = { label: "Team Members" };
      return items;
    }

    items.push({ label: settingsLabels[section] ?? titleCase(section) });
    return items;
  }
  return [dashboard, { label: titleCase(pathname.split("/").at(-1) ?? "") }];
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
