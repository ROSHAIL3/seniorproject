"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import type { NotificationPreferences } from "@/types/notifications";

const preferenceRows: {
  key: keyof Pick<
    NotificationPreferences,
    "bookingEnabled" | "paymentEnabled" | "staffEnabled" | "systemEnabled"
  >;
  title: string;
  detail: string;
}[] = [
  {
    key: "bookingEnabled",
    title: "Booking operations",
    detail: "New bookings, cancellations, reschedules, approvals, and rejections.",
  },
  {
    key: "paymentEnabled",
    title: "Payments and refunds",
    detail: "Recorded payments, refunds, and manual refund-review warnings.",
  },
  {
    key: "staffEnabled",
    title: "Team operations",
    detail: "Staff-related operational alerts added in future phases.",
  },
  {
    key: "systemEnabled",
    title: "System notices",
    detail: "Security, quota, migration, and application notices.",
  },
];

export default function NotificationsSettingsClient({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saved, setSaved] = useState(initialPreferences);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(preferences) !== JSON.stringify(saved);

  const save = async () => {
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/notifications/preferences", {
      body: JSON.stringify(preferences),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error ?? "Preferences could not be saved.");
    } else {
      setPreferences(body);
      setSaved(body);
      setStatus("Preferences saved.");
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Notification preferences
        </h1>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          In-app alerts only. Slotova does not send email, SMS, or WhatsApp
          automatically.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {preferenceRows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-6 border-b border-gray-100 p-5 last:border-b-0 dark:border-gray-800"
          >
            <div>
              <h2 className="font-medium text-gray-800 dark:text-white/90">
                {row.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{row.detail}</p>
            </div>
            <Switch
              label=""
              checked={preferences[row.key]}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  [row.key]: checked,
                }))
              }
            />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <label className="text-sm font-medium text-gray-800 dark:text-white/90">
          Retain my notifications
          <select
            value={preferences.retentionDays}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                retentionDays: Number(event.target.value),
              }))
            }
            className="mt-2 block h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value={7}>7 days — smallest database usage</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days — recommended</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days — highest database usage</option>
          </select>
        </label>
        <p className="mt-3 rounded-lg bg-blue-light-50 p-3 text-xs leading-5 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400">
          Cleanup runs in bounded batches during normal notification activity.
          No scheduled job, paid add-on, or external worker is used.
        </p>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p
          className={`text-sm ${
            status.includes("saved") ? "text-success-600" : "text-error-600"
          }`}
        >
          {status}
        </p>
        <Button disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>

      <section className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-400">
        External delivery channels remain disabled to protect the Supabase Free
        plan. Manual copyable customer messages remain available on appointment
        details.
      </section>
    </div>
  );
}
