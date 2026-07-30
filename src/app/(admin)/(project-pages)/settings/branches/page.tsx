import type { Metadata } from "next";
import BranchesPageClient from "@/components/settings/branches/BranchesPageClient";
import { getBranchesFromDatabase } from "@/server/branches.repository";
import { getBranchFormOptions } from "@/services/branches.service";

export const metadata: Metadata = {
  title: "Branches",
};

export default async function Page() {
  const [branches, options] = await Promise.all([
    getBranchesFromDatabase(),
    getBranchFormOptions(),
  ]);
  return <BranchesPageClient initialBranches={branches} options={options} />;
}
