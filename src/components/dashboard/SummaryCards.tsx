import type { ComponentType, SVGProps } from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  CalenderIcon,
  GroupIcon,
  ShootingStarIcon,
  TimeIcon,
} from "@/icons";

type SummaryCard = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
};

type SummaryCardsProps = {
  todayCount: number;
  weekCount: number;
  teamMemberCount: number;
  activeTeamMemberCount: number;
};

export default function SummaryCards({
  todayCount,
  weekCount,
  teamMemberCount,
  activeTeamMemberCount,
}: SummaryCardsProps) {
  const summaryCards: SummaryCard[] = [
    {
      label: "Today's Appointments",
      value: String(todayCount),
      detail: `${todayCount} scheduled today`,
      icon: CalenderIcon,
    },
    {
      label: "This Week",
      value: String(weekCount),
      detail: "Appointments in the next 7 days",
      icon: TimeIcon,
    },
    {
      label: "Team Members",
      value: String(teamMemberCount),
      detail: `${activeTeamMemberCount} currently active`,
      icon: GroupIcon,
    },
    {
      label: "Plan",
      value: "Starter",
      detail: "Renews on Aug 18, 2026",
      icon: ShootingStarIcon,
      badge: "Active",
    },
  ];
  return (
    <section
      aria-label="Business summary"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {summaryCards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <Icon className="size-6 text-gray-800 dark:text-white/90" />
              </div>
              {card.badge && (
                <Badge
                  color={card.label === "Plan" ? "primary" : "success"}
                  size="sm"
                >
                  {card.badge}
                </Badge>
              )}
            </div>
            <div className="mt-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {card.detail}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
