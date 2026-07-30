import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Slotova workspace.",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
