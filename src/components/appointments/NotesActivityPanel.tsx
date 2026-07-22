"use client";

import { useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { ChatIcon, PaperPlaneIcon } from "@/icons";
import { addAppointmentNote } from "@/services/appointments.service";
import type { ActivityItem } from "@/types/appointments";

type NotesActivityPanelProps = {
  appointmentId: string;
  initialActivity: ActivityItem[];
};

const formatActivityTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function NotesActivityPanel({
  appointmentId,
  initialActivity,
}: NotesActivityPanelProps) {
  const [note, setNote] = useState("");
  const [activity, setActivity] = useState(initialActivity);
  const [postState, setPostState] = useState<"idle" | "loading" | "error">(
    "idle",
  );

  const postNote = async () => {
    const trimmedNote = note.trim();
    if (!trimmedNote) return;
    setPostState("loading");
    try {
      const created = await addAppointmentNote(appointmentId, trimmedNote);
      setActivity((current) => [created, ...current]);
      setNote("");
      setPostState("idle");
    } catch {
      setPostState("error");
    }
  };

  return (
    <ComponentCard
      title="Notes & Activity"
      className="h-full"
      action={<ChatIcon className="size-5 text-brand-500" />}
    >
      <div>
        <TextArea
          value={note}
          onChange={setNote}
          placeholder="Add a note..."
          rows={3}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          {postState === "error" && (
            <p className="text-xs text-error-500">The note could not be posted.</p>
          )}
          <Button
            size="sm"
            onClick={postNote}
            disabled={!note.trim() || postState === "loading"}
            startIcon={<PaperPlaneIcon className="size-4" />}
            className="ml-auto"
          >
            {postState === "loading" ? "Posting..." : "Post note"}
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
          Activity
        </h3>
        {activity.length > 0 ? (
          <ol className="relative ml-2 border-l border-gray-200 pl-5 dark:border-gray-700">
            {activity.map((item) => (
              <li key={item.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[25px] top-1 size-2 rounded-full bg-brand-500 ring-4 ring-white dark:ring-gray-900" />
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {item.detail}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatActivityTime(item.occurredAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">
            No activity yet.
          </p>
        )}
      </div>
    </ComponentCard>
  );
}
