import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  pageTitle?: string;
  items?: BreadcrumbItem[];
  showTitle?: boolean;
  className?: string;
};

export default function PageBreadcrumb({
  pageTitle,
  items,
  showTitle = Boolean(pageTitle),
  className = "",
}: BreadcrumbProps) {
  const breadcrumbItems =
    items ??
    (pageTitle
      ? [
          { label: "Dashboard", href: "/dashboard" },
          { label: pageTitle },
        ]
      : []);

  if (!breadcrumbItems.length) return null;

  if (showTitle && pageTitle) {
    return (
      <div className={`mb-4 print:hidden ${className}`}>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {pageTitle}
        </h2>
      </div>
    );
  }

  return (
    <div
      className={`mb-4 min-w-0 print:hidden ${className}`}
    >
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          {breadcrumbItems.map((item, index) => {
            const isCurrent = index === breadcrumbItems.length - 1;
            return (
              <li
                key={`${item.href ?? "current"}-${item.label}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                {index > 0 && (
                  <svg
                    className="size-4 shrink-0 text-gray-400"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m6 3.75 4.25 4.25L6 12.25"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {!isCurrent && item.href ? (
                  <Link
                    href={item.href}
                    className="max-w-48 truncate rounded text-gray-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-gray-400 dark:hover:text-brand-400"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isCurrent ? "page" : undefined}
                    className="max-w-56 truncate font-medium text-gray-800 dark:text-white/90"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
