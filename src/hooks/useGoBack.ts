"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  resolveReturnTo,
  returnDestinationLabel,
  withReturnTo,
} from "@/lib/navigation";

export function useReturnNavigation(
  fallback = "/dashboard",
  fallbackLabel?: string,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = resolveReturnTo(searchParams.get("returnTo"), fallback);
  const label =
    destination === fallback && fallbackLabel
      ? fallbackLabel
      : returnDestinationLabel(destination);
  const goBack = useCallback(
    () => router.push(destination),
    [destination, router],
  );

  return { destination, label, goBack };
}

export function useCurrentInternalPath() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);
}

export function useOriginHref(destination: string) {
  const origin = useCurrentInternalPath();
  return useMemo(
    () => withReturnTo(destination, origin),
    [destination, origin],
  );
}

export default function useGoBack(fallback = "/dashboard") {
  return useReturnNavigation(fallback).goBack;
}
