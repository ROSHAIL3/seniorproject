"use client";

import Button, { type ButtonProps } from "@/components/ui/button/Button";
import {
  useOriginHref,
  useReturnNavigation,
} from "@/hooks/useGoBack";

export default function ContextAwareButton(props: ButtonProps) {
  const fallback = props.href ?? "/dashboard";
  const back = useReturnNavigation(fallback);
  const originHref = useOriginHref(fallback);
  const isReturnAction =
    typeof props.children === "string" &&
    /^(?:Back|Cancel)\b/i.test(props.children);
  const href = props.href
    ? isReturnAction
      ? back.destination
      : originHref
    : undefined;

  return <Button {...props} href={href} />;
}
