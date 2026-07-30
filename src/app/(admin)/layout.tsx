import type { ReactNode } from "react";
import AdminShell from "@/layout/AdminShell";
import { getWorkspaceIdentityFromDatabase } from "@/server/workspace-identity.repository";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const identity = await getWorkspaceIdentityFromDatabase();
  return <AdminShell identity={identity}>{children}</AdminShell>;
}
