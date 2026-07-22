"use client";
import Logo from "./Logo";
import Link from "next/link";
import Button from "./Button";
import { useState } from "react";

const navLinks = [
  { href: "#team", label: "About us" },
  { href: "#services", label: "Services" },
  { href: "/", label: "Use Cases" },
  { href: "/", label: "Pricing" },
  { href: "/", label: "Blog" },
];

export default function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    const dialog = document.getElementById(
      "navigation-menu-dialog"
    ) as HTMLDialogElement;
    if (dialog && typeof dialog.hidePopover === "function") {
      dialog.hidePopover();
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-[100px] max-xl:px-[60px] max-sm:px-[30px] max-md:gap-[20px] py-0 relative w-full max-w-[1440px] mx-auto">
      <Link
        href="/"
        className="flex items-start overflow-clip px-0 py-[10px] relative max-md:w-full"
        aria-label="Home"
      >
        <Logo className="relative" />
      </Link>
      <div className="flex gap-[40px] items-center justify-center relative shrink-0 max-xl:hidden">
        {navLinks.map(({ href, label }, index) => (
          <Link
            key={index}
            href={href}
            onClick={() => {
              if (href.startsWith("#")) {
                const element = document.querySelector(href);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }
            }}
            className="font-normal leading-[28px] relative shrink-0 text-[20px] text-black ml-px"
          >
            {label}
          </Link>
        ))}
        <Button href="/dashboard" variant="primary">
          Sign In
        </Button>
        <Button
          href="/signup"
          variant="secondary"
          className="py-[18px] px-[34px]"
        >
          Sign Up
        </Button>
      </div>
      <Button
        variant="secondary"
        className="xl:hidden"
        onClick={() => setIsMenuOpen(true)}
        popoverTarget="navigation-menu-dialog"
        popoverTargetAction="show"
      >
        MENU
      </Button>
      <dialog
        id="navigation-menu-dialog"
        popover="auto"
        open={isMenuOpen}
        className="xl:hidden fixed top-0 left-0 w-full h-full bg-white z-50"
        onClose={() => setIsMenuOpen(false)}
      >
        <div className="flex flex-col gap-[40px] items-center justify-center relative shrink-0 p-[100px]">
          <Button
            variant="secondary"
            className="py-[18px] px-[34px]"
            onClick={closeMenu}
            popoverTarget="navigation-menu-dialog"
            popoverTargetAction="hide"
          >
            CLOSE
          </Button>
          {navLinks.map(({ href, label }, index) => (
            <Link
              key={index}
              href={href}
              onClick={(e) => {
                closeMenu();
                // For hash links or same page links, prevent default to allow menu to close
                if (href === "." || href.startsWith("#")) {
                  e.preventDefault();
                }
              }}
              className="font-normal leading-[28px] relative shrink-0 text-[20px] text-black ml-px"
              popoverTarget="navigation-menu-dialog"
              popoverTargetAction="hide"
            >
              {label}
            </Link>
          ))}
          <Button
            href="/dashboard"
            variant="primary"
            popoverTarget="navigation-menu-dialog"
            popoverTargetAction="hide"
            onClick={closeMenu}
          >
            Sign In
          </Button>
          <Button
            href="/signup"
            variant="secondary"
            className="py-[18px] px-[34px]"
            popoverTarget="navigation-menu-dialog"
            popoverTargetAction="hide"
            onClick={closeMenu}
          >
            Sign Up
          </Button>
        </div>
      </dialog>
    </div>
  );
}
