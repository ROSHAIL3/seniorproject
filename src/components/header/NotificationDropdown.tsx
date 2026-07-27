"use client";

import React, { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type NotificationStatus = "success" | "warning" | "error" | "info";
type NotificationCategory = "Booking" | "Payment" | "Staff" | "Review";

type BusinessNotification = {
  id: string;
  title: string;
  detail: string;
  category: NotificationCategory;
  relativeTime: string;
  status: NotificationStatus;
  unread?: boolean;
  urgent?: boolean;
};

const notifications: BusinessNotification[] = [
  {
    id: "booking-sarah",
    title: "New booking received",
    detail: "Sarah booked Hair Styling with Emma - Today at 3:30 PM",
    category: "Booking",
    relativeTime: "5 min ago",
    status: "success",
    unread: true,
  },
  {
    id: "cancelled-ahmed",
    title: "Appointment cancelled",
    detail: "Ahmed cancelled Dental Cleaning - Tomorrow at 10:00 AM",
    category: "Booking",
    relativeTime: "12 min ago",
    status: "error",
    unread: true,
    urgent: true,
  },
  {
    id: "payment-failed",
    title: "Payment failed",
    detail: "Booking #BK-1048 - Deep Tissue Massage - Today at 5:00 PM",
    category: "Payment",
    relativeTime: "18 min ago",
    status: "error",
    unread: true,
    urgent: true,
  },
  {
    id: "staff-lina",
    title: "Staff member unavailable",
    detail: "Lina - Monday from 2:00 PM to 6:00 PM",
    category: "Staff",
    relativeTime: "32 min ago",
    status: "warning",
    unread: true,
  },
  {
    id: "rescheduled-maya",
    title: "Appointment rescheduled",
    detail: "Maya moved Gel Manicure with Noor - Tue at 11:30 AM",
    category: "Booking",
    relativeTime: "1 hr ago",
    status: "info",
  },
  {
    id: "payment-pending",
    title: "Payment still pending",
    detail: "Omar - Beard Trim with Kareem - Today at 7:00 PM",
    category: "Payment",
    relativeTime: "2 hrs ago",
    status: "warning",
  },
  {
    id: "low-availability",
    title: "Low service availability",
    detail: "Hair Coloring has 2 slots left · Saturday",
    category: "Booking",
    relativeTime: "3 hrs ago",
    status: "warning",
  },
  {
    id: "review-nadia",
    title: "New customer review",
    detail: "Nadia rated Facial Treatment with Rania 5 stars",
    category: "Review",
    relativeTime: "4 hrs ago",
    status: "success",
  },
  {
    id: "confirmation-yousef",
    title: "Confirmation required",
    detail: "Yousef - Physiotherapy with Dr. Sami - Tomorrow at 9:00 AM",
    category: "Booking",
    relativeTime: "5 hrs ago",
    status: "warning",
  },
];

const statusStyles: Record<
  NotificationStatus,
  { indicator: string; icon: string; accent: string }
> = {
  success: {
    indicator: "bg-success-500",
    icon: "border-success-100 bg-success-50 text-success-600 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400",
    accent: "",
  },
  warning: {
    indicator: "bg-warning-500",
    icon: "border-warning-100 bg-warning-50 text-warning-600 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-400",
    accent: "",
  },
  error: {
    indicator: "bg-error-500",
    icon: "border-error-100 bg-error-50 text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400",
    accent: "border-l-2 border-l-error-500 bg-error-50/40 dark:bg-error-500/[0.06]",
  },
  info: {
    indicator: "bg-blue-light-500",
    icon: "border-blue-light-100 bg-blue-light-50 text-blue-light-600 dark:border-blue-light-500/20 dark:bg-blue-light-500/10 dark:text-blue-light-400",
    accent: "",
  },
};

const categoryStyles: Record<NotificationCategory, string> = {
  Booking:
    "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  Payment:
    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  Staff:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  Review:
    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

function NotificationIcon({ status }: { status: NotificationStatus }) {
  if (status === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m5.75 10 2.5 2.5 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === "error") {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 6.25v4.5M10 13.75h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (status === "warning") {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 6.25v4.5M10 13.75h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.59 3.55 2.7 14a1.65 1.65 0 0 0 1.44 2.45h11.72A1.65 1.65 0 0 0 17.3 14L11.4 3.55a1.62 1.62 0 0 0-2.82 0Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 10h8M11 7l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [unreadIds, setUnreadIds] = useState(
    () =>
      new Set(
        notifications
          .filter((notification) => notification.unread)
          .map((notification) => notification.id),
      ),
  );

  useEffect(() => {
    if (!isModalMounted) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalVisible(false);
        window.setTimeout(() => setIsModalMounted(false), 200);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isModalMounted]);

  function toggleDropdown() {
    setIsOpen((open) => !open);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleClick() {
    toggleDropdown();
    setNotifying(false);
  }

  function openTodayModal() {
    setIsOpen(false);
    setIsModalMounted(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsModalVisible(true));
    });
  }

  function closeTodayModal() {
    setIsModalVisible(false);
    window.setTimeout(() => setIsModalMounted(false), 200);
  }

  function markAsRead(notificationId: string) {
    setUnreadIds((current) => {
      const next = new Set(current);
      next.delete(notificationId);
      return next;
    });
  }

  function markAllAsRead() {
    setUnreadIds(new Set());
    setNotifying(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !notifying ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            type="button"
            onClick={toggleDropdown}
            aria-label="Close notifications"
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar" aria-label="Recent notifications">
          {notifications.map((notification) => {
            const styles = statusStyles[notification.status];

            return (
              <li key={notification.id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className={`relative flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${notification.urgent ? styles.accent : ""}`}
                >
                  <span
                    className={`relative flex h-10 w-full max-w-10 shrink-0 items-center justify-center rounded-full border ${styles.icon}`}
                  >
                    <NotificationIcon status={notification.status} />
                    <span
                      className={`absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900 ${styles.indicator}`}
                    />
                  </span>

                  <span className="block min-w-0 flex-1">
                    <span className="mb-0.5 flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-theme-sm font-medium leading-5 text-gray-800 dark:text-white/90">
                        {notification.title}
                      </span>
                      {unreadIds.has(notification.id) && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                    <span className="mb-1.5 block text-theme-xs leading-4 text-gray-500 dark:text-gray-400">
                      {notification.detail}
                    </span>
                    <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${categoryStyles[notification.category]}`}>
                        {notification.category}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-gray-400" />
                      <span>{notification.relativeTime}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={openTodayModal}
          className="block w-full px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </button>
      </Dropdown>

      {isModalMounted && (
        <div
          className={`fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-[2px] transition-opacity duration-200 ${
            isModalVisible ? "opacity-100" : "opacity-0"
          }`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTodayModal();
          }}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="today-notifications-title"
            className={`flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl transition duration-200 ease-out dark:border-gray-800 dark:bg-gray-dark ${
              isModalVisible
                ? "scale-100 opacity-100"
                : "scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <h2
                  id="today-notifications-title"
                  className="text-lg font-semibold text-gray-800 dark:text-white/90"
                >
                  Today&apos;s Notifications
                </h2>
                <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  {notifications.length} notifications received today
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadIds.size === 0}
                  className="text-theme-xs font-medium text-brand-600 transition hover:text-brand-700 disabled:cursor-default disabled:text-gray-400 dark:text-brand-400 dark:hover:text-brand-300 dark:disabled:text-gray-600"
                >
                  Mark All as Read
                </button>
                <button
                  type="button"
                  onClick={closeTodayModal}
                  aria-label="Close today's notifications"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <ul
              className="min-h-0 flex-1 overflow-y-auto p-2 custom-scrollbar"
              aria-label="Today's notification list"
            >
              {notifications.map((notification) => {
                const styles = statusStyles[notification.status];
                const isUnread = unreadIds.has(notification.id);

                return (
                  <li key={`today-${notification.id}`}>
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className={`relative flex w-full items-start gap-3 rounded-xl border-b border-gray-100 px-3 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
                        isUnread ? "bg-brand-50/30 dark:bg-brand-500/[0.04]" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${styles.icon}`}
                      >
                        <NotificationIcon status={notification.status} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                            {notification.title}
                          </span>
                          <span className="shrink-0 text-theme-xs text-gray-400 dark:text-gray-500">
                            {notification.relativeTime}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
                          {notification.detail}
                        </span>
                        <span
                          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${categoryStyles[notification.category]}`}
                        >
                          {notification.category}
                        </span>
                      </span>
                      {isUnread && (
                        <span
                          className="absolute right-3 top-9 h-2 w-2 rounded-full bg-brand-500"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
