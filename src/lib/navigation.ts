const SAFE_ADMIN_PATH =
  /^\/(?:dashboard|calendar|appointment-requests|appointments(?:\/(?:new|[^/?#]+))?|customers(?:\/[^/?#]+)?|invoices(?:\/[^/?#]+)?|expenses(?:\/new)?|reports(?:\/(?:revenue|vat-return|profit-loss|top-customers|staff-performance|service-profitability|busy-hours))?|settings(?:\/(?:organization-profile|branches|services(?:\/(?:new|[^/?#]+)(?:\/edit)?)?|packages(?:\/(?:new|[^/?#]+\/edit))?|team-members(?:\/[^/?#]+)?|appointment-settings|customer-fields|expense-categories|notifications|subscription-billing|add-ons|activity-log|version))?|profile|alerts|avatars|badge|buttons|images|modals|videos|bar-chart|line-chart|form-elements|basic-tables|blank)\/?$/;

export const RETURN_TO_PARAM = "returnTo";

export function isSafeInternalDestination(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }

  try {
    const url = new URL(value, "http://slotova.local");
    return (
      url.origin === "http://slotova.local" &&
      SAFE_ADMIN_PATH.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function resolveReturnTo(
  value: string | null | undefined,
  fallback: string,
) {
  return isSafeInternalDestination(value) ? value! : fallback;
}

export function withReturnTo(destination: string, returnTo: string) {
  if (
    !isSafeInternalDestination(destination) ||
    !isSafeInternalDestination(returnTo)
  ) {
    return destination;
  }

  const url = new URL(destination, "http://slotova.local");
  url.searchParams.set(RETURN_TO_PARAM, returnTo);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function returnDestinationLabel(destination: string) {
  const pathname = new URL(destination, "http://slotova.local").pathname;

  if (pathname === "/calendar") return "Calendar";
  if (pathname === "/appointment-requests") return "Appointment Requests";
  if (pathname.startsWith("/appointments/")) return "Appointment";
  if (pathname === "/appointments") return "Appointments";
  if (pathname.startsWith("/customers/")) return "Customer";
  if (pathname === "/customers") return "Customers";
  if (pathname.startsWith("/invoices/")) return "Invoice";
  if (pathname === "/invoices") return "Invoices";
  if (pathname.startsWith("/expenses/")) return "Expense";
  if (pathname === "/expenses") return "Expenses";
  if (pathname.startsWith("/reports/")) {
    const report = pathname.split("/").at(-1) ?? "Reports";
    return report
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  if (pathname === "/reports") return "Reports";
  if (pathname.startsWith("/settings/services/")) return "Service";
  if (pathname === "/settings/services") return "Services";
  if (pathname.startsWith("/settings/packages/")) return "Package";
  if (pathname === "/settings/packages") return "Packages";
  if (pathname.startsWith("/settings/team-members/")) return "Team Member";
  if (pathname === "/settings/team-members") return "Team Members";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}
