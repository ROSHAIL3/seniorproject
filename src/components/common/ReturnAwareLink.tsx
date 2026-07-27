"use client";

import Link, { type LinkProps } from "next/link";
import {
  Children,
  isValidElement,
  cloneElement,
  type AnchorHTMLAttributes,
  type ReactNode,
  type ReactElement,
} from "react";
import { useReturnNavigation } from "@/hooks/useGoBack";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

export default function ReturnAwareLink({
  href,
  children,
  "aria-label": ariaLabel,
  ...props
}: Props) {
  const back = useReturnNavigation(href);

  return (
    <Link
      href={back.destination}
      aria-label={ariaLabel ?? `Back to ${back.label}`}
      {...props}
    >
      {replaceBackLabel(children, back.label)}
    </Link>
  );
}

function replaceBackLabel(children: ReactNode, label: string): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string" && child.trim()) {
      return `Back to ${label}`;
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      return cloneElement(
        child as ReactElement<{ children?: ReactNode }>,
        undefined,
        replaceBackLabel(child.props.children, label),
      );
    }
    return child;
  });
}
