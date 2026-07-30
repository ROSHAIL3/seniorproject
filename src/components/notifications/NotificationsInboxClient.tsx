"use client";

import Link from "next/link";
import { useState } from "react";
import { relativeTime } from "@/components/header/NotificationDropdown";
import type {
  InAppNotification,
  NotificationCategory,
  NotificationPage,
} from "@/types/notifications";

const filters: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "booking", label: "Bookings" },
  { value: "payment", label: "Payments" },
  { value: "staff", label: "Staff" },
  { value: "system", label: "System" },
];

export default function NotificationsInboxClient({
  initialPage,
}: {
  initialPage: NotificationPage;
}) {
  const [page, setPage] = useState(initialPage);
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (
    nextCategory = category,
    nextUnreadOnly = unreadOnly,
    append = false,
  ) => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      unreadOnly: String(nextUnreadOnly),
    });
    if (nextCategory !== "all") query.set("category", nextCategory);
    if (append && page.nextCursor) {
      query.set("cursorCreatedAt", page.nextCursor.createdAt);
      query.set("cursorId", page.nextCursor.id);
    }
    const response = await fetch(`/api/notifications?${query}`, {
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Notifications could not be loaded.");
    } else {
      const next = body as NotificationPage;
      setPage((current) => ({
        ...next,
        items: append ? [...current.items, ...next.items] : next.items,
      }));
    }
    setLoading(false);
  };

  const chooseCategory = (value: NotificationCategory | "all") => {
    setCategory(value);
    void load(value, unreadOnly);
  };

  const toggleUnread = () => {
    const next = !unreadOnly;
    setUnreadOnly(next);
    void load(category, next);
  };

  const markRead = async (notification: InAppNotification) => {
    if (notification.readAt) return;
    const response = await fetch(`/api/notifications/${notification.id}`, {
      method: "PATCH",
    });
    if (!response.ok) return;
    setPage((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === notification.id
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
      unreadCount: Math.max(0, current.unreadCount - 1),
    }));
  };

  const markAll = async () => {
    const response = await fetch("/api/notifications/read-all", {
      method: "POST",
    });
    if (!response.ok) return;
    const readAt = new Date().toISOString();
    setPage((current) => ({
      ...current,
      items: current.items.map((item) => ({ ...item, readAt })),
      unreadCount: 0,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Operational alerts for your organization · {page.unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings/notifications"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Preferences
          </Link>
          <button
            disabled={!page.unreadCount}
            onClick={() => void markAll()}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => chooseCategory(filter.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              category === filter.value
                ? "bg-brand-500 text-white"
                : "border border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            {filter.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={toggleUnread}
            className="size-4 accent-brand-500"
          />
          Unread only
        </label>
      </div>

      {error && (
        <p className="rounded-xl bg-error-50 p-3 text-sm text-error-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {page.items.map((notification) => (
          <Link
            key={notification.id}
            href={notification.href ?? "/notifications"}
            onClick={() => void markRead(notification)}
            className={`flex gap-4 border-b border-gray-100 p-4 transition last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
              notification.readAt ? "" : "bg-brand-50/30 dark:bg-brand-500/[0.04]"
            }`}
          >
            <span className={`mt-2 size-2.5 shrink-0 rounded-full ${severityDot(notification.severity)}`} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {notification.title}
                </span>
                <span className="text-xs text-gray-400">
                  {relativeTime(notification.createdAt)}
                </span>
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                {notification.detail}
              </span>
              <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {notification.category}
              </span>
            </span>
            {!notification.readAt && (
              <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-500" />
            )}
          </Link>
        ))}
        {!loading && !page.items.length && (
          <p className="p-12 text-center text-sm text-gray-500">
            No notifications match these filters.
          </p>
        )}
      </div>
      {loading && <p className="text-center text-sm text-gray-500">Loading…</p>}
      {page.nextCursor && !loading && (
        <button
          onClick={() => void load(category, unreadOnly, true)}
          className="mx-auto block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          Load more
        </button>
      )}
    </div>
  );
}

function severityDot(severity: InAppNotification["severity"]) {
  if (severity === "error") return "bg-error-500";
  if (severity === "warning") return "bg-warning-500";
  if (severity === "success") return "bg-success-500";
  return "bg-blue-light-500";
}
