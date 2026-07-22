"use client";

import { useState } from "react";
import { MoreDotIcon } from "@/icons";
import ThemedBarChart from "@/components/charts/bar/ThemedBarChart";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";

const monthlySales = [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112].map((value, index) => ({ label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index], value }));

export default function MonthlySalesChart() {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monthly Sales</h3><div className="relative inline-block"><button onClick={() => setIsOpen((current) => !current)} className="dropdown-toggle"><MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" /></button><Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2"><DropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full rounded-lg text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">View More</DropdownItem><DropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full rounded-lg text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">Delete</DropdownItem></Dropdown></div></div><div className="-ml-2"><ThemedBarChart data={monthlySales} seriesName="Sales" height={220} minWidth={650} /></div></div>;
}
