"use client";

import { useState, FormEvent } from "react";
import { cn } from "../lib/utils";
import Button from "./Button";

type SubscriptionFormProps = {
  className?: string;
};

export default function SubscriptionForm({ className }: SubscriptionFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");

    // TODO: Add your subscription API call here
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEmail("");
      // TODO: Add success message here
      setStatus("success");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      // TODO: Add error message here
      void error;
      setStatus("error");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setStatus("idle");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "bg-[#292a32] flex gap-[20px] items-start overflow-clip relative rounded-[14px] xl:mr-px flex-3 max-w-[634px]",
        "px-[40px] max-xl:px-[30px] py-[58px] max-xl:py-[40px] max-md:px-[20px] max-md:py-[30px]",
        "max-lg:flex-col",
        "max-md:flex-row max-sm:flex-col max-sm:w-full",
        className
      )}
      method="POST"
    >
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        required
        disabled={status === "submitting"}
        className={cn(
          "border border-solid border-white flex flex-1 w-full items-start overflow-clip px-[35px] py-[21px] max-xl:py-[17px] max-md:py-[12px] max-md:px-[20px] relative rounded-[14px] font-normal text-[18px]/[normal] max-xl:leading-[24px] text-white placeholder:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#292a32] disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      />
      <Button
        type="submit"
        variant="tertiary"
        className="px-[35px] py-[19px] max-md:px-[20px] max-md:py-[10px] rounded-[14px] shrink-0 max-lg:w-full max-lg:text-[16px]/[30px] justify-center max-md:w-auto max-sm:w-full"
        disabled={status === "submitting"}
      >
        {
          {
            idle: "Subscribe to news",
            submitting: "Please wait...",
            success: "Thank you!",
            error: "Try again",
          }[status]
        }
      </Button>
    </form>
  );
}
