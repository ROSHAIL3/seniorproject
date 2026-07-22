import { CalenderIcon } from "@/icons";

type DashboardEmptyStateProps = {
  title: string;
  description: string;
};

export default function DashboardEmptyState({
  title,
  description,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <CalenderIcon className="size-6" />
      </div>
      <p className="font-medium text-gray-800 dark:text-white/90">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
