"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon } from "@/icons";

export type PhoneCountry = { code: string; name: string; callingCode: string };
export type PhoneInputProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (internationalNumber: string) => void;
  onBlur?: () => void;
  error?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  ariaLabel?: string;
  countries?: PhoneCountry[];
  defaultCountry?: string;
  className?: string;
};

export const phoneCountries: PhoneCountry[] = [
  { code: "BH", name: "Bahrain", callingCode: "+973" }, { code: "SA", name: "Saudi Arabia", callingCode: "+966" },
  { code: "AE", name: "United Arab Emirates", callingCode: "+971" }, { code: "KW", name: "Kuwait", callingCode: "+965" },
  { code: "QA", name: "Qatar", callingCode: "+974" }, { code: "OM", name: "Oman", callingCode: "+968" },
  { code: "US", name: "United States", callingCode: "+1" }, { code: "CA", name: "Canada", callingCode: "+1" },
  { code: "GB", name: "United Kingdom", callingCode: "+44" }, { code: "IE", name: "Ireland", callingCode: "+353" },
  { code: "AU", name: "Australia", callingCode: "+61" }, { code: "NZ", name: "New Zealand", callingCode: "+64" },
  { code: "IN", name: "India", callingCode: "+91" }, { code: "PK", name: "Pakistan", callingCode: "+92" },
  { code: "BD", name: "Bangladesh", callingCode: "+880" }, { code: "LK", name: "Sri Lanka", callingCode: "+94" },
  { code: "PH", name: "Philippines", callingCode: "+63" }, { code: "ID", name: "Indonesia", callingCode: "+62" },
  { code: "MY", name: "Malaysia", callingCode: "+60" }, { code: "SG", name: "Singapore", callingCode: "+65" },
  { code: "TH", name: "Thailand", callingCode: "+66" }, { code: "VN", name: "Vietnam", callingCode: "+84" },
  { code: "CN", name: "China", callingCode: "+86" }, { code: "JP", name: "Japan", callingCode: "+81" },
  { code: "KR", name: "South Korea", callingCode: "+82" }, { code: "TR", name: "Türkiye", callingCode: "+90" },
  { code: "EG", name: "Egypt", callingCode: "+20" }, { code: "JO", name: "Jordan", callingCode: "+962" },
  { code: "LB", name: "Lebanon", callingCode: "+961" }, { code: "IQ", name: "Iraq", callingCode: "+964" },
  { code: "DE", name: "Germany", callingCode: "+49" }, { code: "FR", name: "France", callingCode: "+33" },
  { code: "IT", name: "Italy", callingCode: "+39" }, { code: "ES", name: "Spain", callingCode: "+34" },
  { code: "NL", name: "Netherlands", callingCode: "+31" }, { code: "BE", name: "Belgium", callingCode: "+32" },
  { code: "CH", name: "Switzerland", callingCode: "+41" }, { code: "SE", name: "Sweden", callingCode: "+46" },
  { code: "NO", name: "Norway", callingCode: "+47" }, { code: "DK", name: "Denmark", callingCode: "+45" },
  { code: "BR", name: "Brazil", callingCode: "+55" }, { code: "MX", name: "Mexico", callingCode: "+52" },
  { code: "ZA", name: "South Africa", callingCode: "+27" }, { code: "NG", name: "Nigeria", callingCode: "+234" },
  { code: "KE", name: "Kenya", callingCode: "+254" }, { code: "MA", name: "Morocco", callingCode: "+212" },
];

export default function PhoneInput({ id, name, value, defaultValue = "", placeholder = "Phone number", onChange, onBlur, error = false, disabled = false, autoComplete = "tel", ariaLabel = "Phone number", countries = phoneCountries, defaultCountry = "BH", className = "" }: PhoneInputProps) {
  const generatedId = useId(); const listId = `${generatedId}-countries`; const wrapperRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => splitNumber(value ?? defaultValue, countries, defaultCountry), [countries, defaultCountry, defaultValue, value]);
  const [selectedCode, setSelectedCode] = useState(initial.country.code); const [localNumber, setLocalNumber] = useState(initial.localNumber);
  const [open, setOpen] = useState(false); const [query, setQuery] = useState("");
  const controlled = value !== undefined ? splitNumber(value, countries, defaultCountry) : null;
  const effectiveCode = controlled && value ? controlled.country.code : selectedCode;
  const displayedNumber = controlled ? controlled.localNumber : localNumber;
  const selected = countries.find((country) => country.code === effectiveCode) ?? countries[0];
  useEffect(() => { const close = (event: PointerEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  const filtered = countries.filter((country) => `${country.name} ${country.code} ${country.callingCode}`.toLowerCase().includes(query.trim().toLowerCase()));
  const emit = (country: PhoneCountry, nextLocal: string) => onChange?.(nextLocal ? `${country.callingCode}${digitsOnly(nextLocal)}` : "");
  const choose = (country: PhoneCountry) => { setSelectedCode(country.code); setOpen(false); setQuery(""); emit(country, displayedNumber); };
  const stateClasses = disabled ? "border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" : error ? "border-error-500 text-error-800 focus-within:ring-error-500/10 dark:border-error-500 dark:text-error-400" : "border-gray-300 bg-transparent text-gray-800 focus-within:border-brand-300 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus-within:border-brand-800";
  return <div ref={wrapperRef} className={`relative ${className}`}>
    <div className={`flex h-11 w-full rounded-lg border shadow-theme-xs focus-within:ring-3 ${stateClasses}`}>
      <button type="button" disabled={disabled} aria-expanded={open} aria-controls={listId} aria-label="Choose phone country" onClick={() => setOpen((current) => !current)} className="flex min-w-[76px] items-center justify-center gap-2 rounded-l-lg border-r border-gray-200 px-3 text-sm disabled:cursor-not-allowed dark:border-gray-700"><span aria-hidden>{flag(selected.code)}</span><ChevronDownIcon className="size-4 text-gray-500 dark:text-gray-400" /></button>
      <span className="inline-flex shrink-0 items-center px-3 text-sm font-medium text-gray-700 dark:text-gray-300" aria-label={`${selected.name} calling code`}>{selected.callingCode}</span>
      <input id={id} name={name} type="tel" inputMode="tel" value={displayedNumber} disabled={disabled} placeholder={placeholder} autoComplete={autoComplete} aria-label={ariaLabel} aria-invalid={error || undefined} onBlur={onBlur} onChange={(event) => { const next = digitsOnly(event.target.value); if (value === undefined) setLocalNumber(next); emit(selected, next); }} className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:placeholder:text-white/30" />
    </div>
    {open && !disabled && <div id={listId} className="absolute z-50 mt-2 w-full min-w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-dark"><div className="border-b border-gray-100 p-2 dark:border-gray-800"><div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or code" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" /></div></div><div className="max-h-64 overflow-y-auto p-1.5">{filtered.map((country) => <button key={country.code} type="button" onClick={() => choose(country)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 ${country.code === selected.code ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}><span className="text-lg" aria-hidden>{flag(country.code)}</span><span className="min-w-0 flex-1 truncate">{country.name} <span className="text-xs text-gray-400">({country.code})</span></span><span className="font-medium">{country.callingCode}</span></button>)}{!filtered.length && <p className="px-3 py-5 text-center text-sm text-gray-500">No countries found.</p>}</div></div>}
  </div>;
}

function splitNumber(number: string, countries: PhoneCountry[], defaultCountry: string) { const normalized = number.trim().replace(/[\s()-]/g, ""); const sorted = [...countries].sort((a, b) => b.callingCode.length - a.callingCode.length); const country = sorted.find((item) => normalized.startsWith(item.callingCode)) ?? countries.find((item) => item.code === defaultCountry) ?? countries[0]; const localNumber = normalized.startsWith(country.callingCode) ? normalized.slice(country.callingCode.length) : normalized.replace(/^\+/, ""); return { country, localNumber: digitsOnly(localNumber) }; }
function digitsOnly(value: string) { return value.replace(/\D/g, ""); }
function flag(code: string) { return code.toUpperCase().replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))); }
