import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set Password | Slotova",
  description: "Set your Slotova account password.",
};

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/signin?error=confirmation-failed");
  return <SetPasswordForm />;
}
