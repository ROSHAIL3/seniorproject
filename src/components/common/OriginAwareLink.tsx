"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { useOriginHref } from "@/hooks/useGoBack";

type OriginAwareLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

export default function OriginAwareLink({
  href,
  ...props
}: OriginAwareLinkProps) {
  const originHref = useOriginHref(href);
  return <Link href={originHref} {...props} />;
}
