"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import type { InAppNotification, NotificationPage } from "@/types/notifications";

const severityClass = {
  error: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
  info: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?unreadOnly=false", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const page = (await response.json()) as NotificationPage;
      setItems(page.items.slice(0, 8));
      setUnreadCount(page.unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const open = () => {
    setIsOpen((current) => !current);
    if (!isOpen) void load();
  };

  const markRead = async (notification: InAppNotification) => {
    if (!notification.readAt) {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });
      if (response.ok) {
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    }
    setIsOpen(false);
  };

  const markAll = async () => {
    const response = await fetch("/api/notifications/read-all", {
      method: "POST",
    });
    if (!response.ok) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt })));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        onClick={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10.75 2.292a.75.75 0 0 0-1.5 0v.544a6.38 6.38 0 0 0-5.625 6.331v5.292h-.292a.75.75 0 0 0 0 1.5h13.334a.75.75 0 0 0 0-1.5h-.292V9.167a6.38 6.38 0 0 0-5.625-6.331v-.544Zm4.125 12.167V9.167a4.875 4.875 0 1 0-9.75 0v5.292h9.75ZM8 17.708a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0"
      >
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <div>
            <h5 className="font-semibold text-gray-800 dark:text-white/90">Notifications</h5>
            <p className="text-xs text-gray-400">{unreadCount} unread</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void load()}
              className="text-xs font-medium text-gray-500 hover:text-brand-600"
            >
              Refresh
            </button>
            <button
              onClick={() => void markAll()}
              disabled={!unreadCount}
              className="text-xs font-medium text-brand-600 disabled:text-gray-300"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          {items.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href ?? "/notifications"}
              onClick={() => void markRead(notification)}
              className={`flex gap-3 rounded-xl border-b border-gray-100 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
                notification.readAt ? "" : "bg-brand-50/40 dark:bg-brand-500/[0.05]"
              }`}
            >
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase ${severityClass[notification.severity]}`}>
                {notification.category.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-gray-800 dark:text-white/90">
                    {notification.title}
                  </span>
                  {!notification.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {notification.detail}
                </span>
                <span className="mt-1 block text-[11px] capitalize text-gray-400">
                  {notification.category} · {relativeTime(notification.createdAt)}
                </span>
              </span>
            </Link>
          ))}
          {!loading && !items.length && (
            <p className="px-4 py-12 text-center text-sm text-gray-500">
              No notifications yet.
            </p>
          )}
          {loading && !items.length && (
            <p className="px-4 py-12 text-center text-sm text-gray-500">
              Loading notifications…
            </p>
          )}
        </div>
        <Link
          href="/notifications"
          onClick={() => setIsOpen(false)}
          className="mt-3 block rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
        >
          View all notifications
        </Link>
      </Dropdown>
    </div>
  );
}

export function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
