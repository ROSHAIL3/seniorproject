"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, ChevronDownIcon, UserCircleIcon } from "@/icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setIsOpen(false);
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="relative">
      <button type="button" onClick={(event) => { event.stopPropagation(); setIsOpen((open) => !open); }} className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400" aria-expanded={isOpen} aria-haspopup="menu">
        <span className="mr-3 h-11 w-11 overflow-hidden rounded-full"><Image width={44} height={44} src="/images/user/owner.jpg" alt="User" /></span>
        <span className="mr-1 hidden font-medium text-theme-sm sm:block">Musharof</span>
        <ChevronDownIcon className={`size-5 shrink-0 overflow-visible transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
        <div className="px-1"><span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">Musharof Chowdhury</span><span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">randomuser@pimjo.com</span></div>
        <ul className="mt-3 border-b border-gray-200 pb-3 dark:border-gray-800"><li><DropdownItem onItemClick={() => setIsOpen(false)} tag="a" href="/settings/organization-profile" className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"><UserCircleIcon className="size-5 shrink-0 overflow-visible text-gray-500" />Edit organization</DropdownItem></li></ul>
        <button type="button" onClick={handleSignOut} className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"><ArrowRightIcon className="size-5 shrink-0 rotate-180 overflow-visible text-gray-500" />Sign out</button>
      </Dropdown>
    </div>
  );
}
