"use client";

import React, { Suspense } from "react";
import AdminBreadcrumbs from "@/components/common/AdminBreadcrumbs";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import type { WorkspaceIdentity } from "@/types/workspace-identity";

export default function AdminShell({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: WorkspaceIdentity;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[264px]"
      : "lg:ml-[80px]";

  return (
    <div className="dashboard-shell min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-white/90 xl:flex">
      <AppSidebar />
      <Backdrop />
      <div
        className={`admin-main-content min-w-0 flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader identity={identity} />
        <div className="admin-page-content mx-auto max-w-(--breakpoint-2xl) p-4 md:p-5">
          <Suspense fallback={null}>
            <AdminBreadcrumbs />
          </Suspense>
          {children}
        </div>
      </div>
    </div>
  );
}
