import type { Metadata } from "next";
import BranchesPageClient from "@/components/settings/branches/BranchesPageClient";
import { getBranchFormOptions, getBranches } from "@/services/branches.service";

export const metadata: Metadata = {
  title: "Branches | Senior Project",
};

export default async function Page() {
  const [branches, options] = await Promise.all([getBranches(), getBranchFormOptions()]);
  return <BranchesPageClient initialBranches={branches} options={options} />;
}
