import Image from "next/image";

export default function TeamMemberAvatar({ name, photoUrl, className = "size-16" }: { name: string; photoUrl?: string; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return photoUrl ? <Image src={photoUrl} alt={`${name} profile`} width={128} height={128} unoptimized className={`${className} rounded-full object-cover`} /> : <span aria-label={`${name} initials`} className={`${className} inline-flex items-center justify-center rounded-full border border-gray-200 bg-gray-100 font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}>{initials}</span>;
}
