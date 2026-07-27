"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircleIcon, CloseIcon, ErrorIcon } from "@/icons";

export type BookingToastMessage = {
  id: number;
  type: "success" | "error";
  title: string;
  message: string;
};

type BookingToastProps = {
  toast: BookingToastMessage;
  onClose: () => void;
};

export default function BookingToast({
  toast,
  onClose,
}: BookingToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  const close = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() =>
      setIsVisible(true),
    );
    const dismissTimer = window.setTimeout(close, 4500);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(dismissTimer);
    };
  }, [close, toast.id]);

  return createPortal(
    <div className="dashboard-shell contents">
      <div
        className={`pointer-events-none fixed inset-x-0 top-4 z-[100005] flex justify-center px-4 transition-all duration-200 ease-out ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-3 opacity-0"
        }`}
      >
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-theme-xl dark:bg-gray-900 ${
            toast.type === "success"
              ? "border-success-300 dark:border-success-500/40"
              : "border-error-300 dark:border-error-500/40"
          }`}
        >
          <span
            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
              toast.type === "success"
                ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon className="size-5" />
            ) : (
              <ErrorIcon className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {toast.title}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-gray-600 dark:text-gray-300">
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close notification"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
