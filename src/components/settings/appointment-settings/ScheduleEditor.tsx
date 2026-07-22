"use client";

import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import { CopyIcon } from "@/icons";
import type { ScheduleDay } from "@/types/appointment-settings";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ScheduleEditor({
  days,
  onChange,
  errors = {},
  disabled = false,
}: {
  days: ScheduleDay[];
  onChange: (days: ScheduleDay[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const updateDay = (dayOfWeek: number, update: Partial<ScheduleDay>) => {
    onChange(days.map((day) => day.dayOfWeek === dayOfWeek ? { ...day, ...update } : day));
  };

  const copySunday = () => {
    const sunday = days.find((day) => day.dayOfWeek === 0);
    if (!sunday || disabled) return;
    onChange(days.map((day) => ({ ...sunday, dayOfWeek: day.dayOfWeek })));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" startIcon={<CopyIcon />} onClick={copySunday} disabled={disabled} className="!min-h-9 !px-3 !py-1.5">
          Copy Sunday to all days
        </Button>
      </div>
      <div className="hidden grid-cols-[minmax(125px,1fr)_repeat(4,minmax(112px,1fr))_64px] gap-2 border-b border-gray-100 pb-2 text-[11px] font-medium uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:grid">
        <span>Day</span><span>Start time</span><span>End time</span><span>Break start</span><span>Break end</span><span className="text-right">Open</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {days.map((day) => {
          const inactive = disabled || !day.isOpen;
          const error = errors[`day-${day.dayOfWeek}`];
          return (
            <div key={day.dayOfWeek} className="py-2 first:pt-0">
              <div className="grid items-center gap-2 lg:grid-cols-[minmax(125px,1fr)_repeat(4,minmax(112px,1fr))_64px]">
                <div className="flex items-center justify-between gap-3 lg:block">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-800 dark:text-white/90">{dayNames[day.dayOfWeek]}</span>{!day.isOpen && <span className="text-xs italic text-gray-400">Closed</span>}</div>
                  <div className="lg:hidden"><Switch label="" checked={day.isOpen} disabled={disabled} onChange={(isOpen) => updateDay(day.dayOfWeek, { isOpen })} /></div>
                </div>
                {day.isOpen ? <><LabeledTime label="Start time" value={day.startTime} disabled={inactive} onChange={(startTime) => updateDay(day.dayOfWeek, { startTime })} /><LabeledTime label="End time" value={day.endTime} disabled={inactive} onChange={(endTime) => updateDay(day.dayOfWeek, { endTime })} /><LabeledTime label="Break start (optional)" value={day.breakStartTime} disabled={inactive} onChange={(breakStartTime) => updateDay(day.dayOfWeek, { breakStartTime })} /><LabeledTime label="Break end (optional)" value={day.breakEndTime} disabled={inactive} onChange={(breakEndTime) => updateDay(day.dayOfWeek, { breakEndTime })} /></> : <div className="hidden lg:col-span-4 lg:block" />}
                <div className="hidden justify-end lg:flex"><Switch label="" checked={day.isOpen} disabled={disabled} onChange={(isOpen) => updateDay(day.dayOfWeek, { isOpen })} /></div>
              </div>
              {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabeledTime({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 lg:hidden">{label}</span>
      <Input type="time" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} ariaLabel={label} className="!h-9 !py-1.5" />
    </div>
  );
}
