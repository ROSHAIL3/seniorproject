import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Slotova workspace.",
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <SignInForm
      organizationDeleted={query.error === "organization-deleted"}
      accessDisabled={query.error === "access-disabled"}
      authenticationFailed={query.error === "confirmation-failed"}
      onboardingFailed={query.error === "onboarding-failed"}
    />
  );
}
