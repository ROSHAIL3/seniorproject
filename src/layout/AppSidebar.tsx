"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useSidebar } from "@/context/SidebarContext";
import BrandLogo from "@/components/common/BrandLogo";
import {
  BellIcon,
  BoxCubeIcon,
  BoxIcon,
  CalenderIcon,
  ChevronLeftIcon,
  DocsIcon,
  DollarLineIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  InfoIcon,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
  TaskIcon,
  TimeIcon,
  UserCircleIcon,
} from "@/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type NavigationItem = {
  label: string;
  href: string;
  icon: Icon;
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const mainNavigation: NavigationSection[] = [
  {
    label: "Main",
    items: [{ label: "Dashboard", href: "/dashboard", icon: GridIcon }],
  },
  {
    label: "Appointments",
    items: [
      { label: "Appointments", href: "/appointments", icon: TaskIcon },
      { label: "Calendar", href: "/calendar", icon: CalenderIcon },
      { label: "Customers", href: "/customers", icon: GroupIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Invoices", href: "/invoices", icon: DocsIcon },
      { label: "Expenses", href: "/expenses", icon: DollarLineIcon },
      { label: "Reports", href: "/reports", icon: PieChartIcon },
    ],
  },
  {
    label: "Configure",
    items: [{ label: "Settings", href: "/settings", icon: PlugInIcon }],
  },
];

const settingsNavigation: NavigationSection[] = [
  {
    label: "Business setup",
    items: [
      {
        label: "Appointment settings",
        href: "/settings/appointment-settings",
        icon: CalenderIcon,
      },
      {
        label: "Organization profile",
        href: "/settings/organization-profile",
        icon: UserCircleIcon,
      },
      { label: "Branches", href: "/settings/branches", icon: BoxCubeIcon },
      {
        label: "Customer fields",
        href: "/settings/customer-fields",
        icon: ListIcon,
      },
      {
        label: "Notifications",
        href: "/settings/notifications",
        icon: BellIcon,
      },
      {
        label: "Activity log",
        href: "/settings/activity-log",
        icon: TimeIcon,
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Services", href: "/settings/services", icon: ListIcon },
      { label: "Packages", href: "/settings/packages", icon: BoxIcon },
    ],
  },
  {
    label: "Expenses",
    items: [
      {
        label: "Expense categories",
        href: "/settings/expense-categories",
        icon: DollarLineIcon,
      },
    ],
  },
  {
    label: "Team & access",
    items: [
      {
        label: "Team members",
        href: "/settings/team-members",
        icon: GroupIcon,
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        label: "Subscription & billing",
        href: "/settings/subscription-billing",
        icon: DollarLineIcon,
      },
      { label: "Add-ons", href: "/settings/add-ons", icon: PlugInIcon },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Version", href: "/settings/version", icon: InfoIcon },
    ],
  },
];

const reportsNavigation: NavigationSection[] = [
  {
    label: "Financial",
    items: [
      { label: "Revenue", href: "/reports/revenue", icon: PieChartIcon },
      { label: "VAT Return", href: "/reports/vat-return", icon: DocsIcon },
      { label: "Profit & Loss", href: "/reports/profit-loss", icon: DollarLineIcon },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Top Customers", href: "/reports/top-customers", icon: GroupIcon },
      { label: "Staff Performance", href: "/reports/staff-performance", icon: UserCircleIcon },
      { label: "Service Profitability", href: "/reports/service-profitability", icon: ListIcon },
    ],
  },
  {
    label: "Operations",
    items: [{ label: "Busy Hours", href: "/reports/busy-hours", icon: TimeIcon }],
  },
];

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const isSettingsMenu = pathname === "/settings" || pathname.startsWith("/settings/");
  const isReportsMenu = pathname === "/reports" || pathname.startsWith("/reports/");
  const navigation = isSettingsMenu ? settingsNavigation : isReportsMenu ? reportsNavigation : mainNavigation;
  const showLabels = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded || isMobileOpen || isHovered ? "w-[264px]" : "w-[80px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-6 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/dashboard" aria-label="Dashboard">
          <BrandLogo
            size={showLabels ? "md" : "sm"}
            iconOnly={!showLabels}
            className="text-gray-900 dark:text-white"
            priority
          />
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto pb-24 duration-300 ease-linear">
        {(isSettingsMenu || isReportsMenu) && (
          <Link
            href="/dashboard"
            className={`menu-item menu-item-inactive group mb-4 border border-gray-200 dark:border-gray-800 ${
              showLabels ? "justify-start" : "lg:justify-center"
            }`}
          >
            <ChevronLeftIcon className="menu-item-icon-inactive size-5" />
            {showLabels && <span className="menu-item-text">Back to menu</span>}
          </Link>
        )}

        <nav aria-label={isSettingsMenu ? "Settings" : isReportsMenu ? "Reports" : "Main navigation"}>
          <div className="flex flex-col">
            {navigation.map((section, sectionIndex) => (
              <section
                key={section.label}
                className={
                  sectionIndex === 0
                    ? "pb-4"
                    : "border-t border-gray-200 py-4 dark:border-gray-800"
                }
              >
                <h2
                  className={`mb-2.5 flex text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-gray-500 dark:text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {showLabels ? section.label : <HorizontaLDots />}
                </h2>

                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={`menu-item group ${
                            isActive ? "menu-item-active" : "menu-item-inactive"
                          } ${!showLabels ? "lg:justify-center" : "lg:justify-start"}`}
                        >
                          <span
                            className={
                              isActive
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"
                            }
                          >
                            <Icon />
                          </span>
                          {showLabels && (
                            <span className="menu-item-text">{item.label}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
