"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CalenderIcon, ChevronLeftIcon } from "@/icons";

type PickerPosition = {
  left: number;
  top: number;
  opensUpward: boolean;
};

type DatePickerControlProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  displayValue?: (value: string) => string;
  allowClear?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const CALENDAR_WIDTH = 304;
const CALENDAR_HEIGHT = 376;
const VIEWPORT_PADDING = 8;
const POPUP_GAP = 6;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLocalTodayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value?: string) {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
  );
}

function formatInputDate(value: string) {
  const date = parseIsoDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function DatePickerControl({
  id,
  name,
  value,
  defaultValue = "",
  min,
  max,
  placeholder = "Select date",
  disabled = false,
  ariaLabel = "Choose date",
  className = "",
  displayValue = formatInputDate,
  allowClear = true,
  onChange,
  onBlur,
}: DatePickerControlProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;
  const selectedDate = parseIsoDate(selectedValue);
  const today = useMemo(() => getLocalTodayIso(), []);
  const initialMonth =
    selectedDate ?? parseIsoDate(min) ?? new Date(`${today}T00:00:00Z`);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthStart(initialMonth),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow =
      window.innerHeight - rect.bottom - POPUP_GAP - VIEWPORT_PADDING;
    const spaceAbove = rect.top - POPUP_GAP - VIEWPORT_PADDING;
    const opensUpward =
      spaceBelow < CALENDAR_HEIGHT && spaceAbove > spaceBelow;
    const width = Math.min(
      CALENDAR_WIDTH,
      window.innerWidth - VIEWPORT_PADDING * 2,
    );
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.left),
      window.innerWidth - width - VIEWPORT_PADDING,
    );

    setPosition({
      left,
      top: opensUpward ? rect.top - POPUP_GAP : rect.bottom + POPUP_GAP,
      opensUpward,
    });
  }, []);

  const closePicker = useCallback(
    (restoreFocus = false) => {
      setIsOpen(false);
      setPosition(null);
      onBlur?.();
      if (restoreFocus) triggerRef.current?.focus();
    },
    [onBlur],
  );

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) {
        closePicker();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePicker(true);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, isOpen, selectedValue, updatePosition]);

  const calendarDays = useMemo(() => {
    const gridStart = new Date(visibleMonth);
    gridStart.setUTCDate(1 - visibleMonth.getUTCDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const isUnavailable = (date: string) =>
    (!!min && date < min) || (!!max && date > max);

  const monthHasAvailableDate = (month: Date) => {
    const first = toIsoDate(month);
    const last = toIsoDate(
      new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
      ),
    );
    return (!min || last >= min) && (!max || first <= max);
  };

  const selectDate = (nextValue: string) => {
    if (isUnavailable(nextValue)) return;
    if (!isControlled) setInternalValue(nextValue);
    onChange(nextValue);
    closePicker(true);
  };

  const clearDate = () => {
    if (!isControlled) setInternalValue("");
    onChange("");
    closePicker(true);
  };

  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);
  const canUseToday = !isUnavailable(today);

  const popup =
    isOpen &&
    position &&
    createPortal(
      <div className="dashboard-shell contents">
        <div
          ref={popupRef}
          role="dialog"
          aria-modal="false"
          aria-label={ariaLabel}
          className="fixed z-[100002] w-[304px] max-w-[calc(100vw-16px)] rounded-xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
          style={{
            left: position.left,
            top: position.top,
            transform: position.opensUpward ? "translateY(-100%)" : undefined,
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!monthHasAvailableDate(previousMonth)}
              onClick={() => setVisibleMonth(previousMonth)}
              className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <p
              className="text-sm font-semibold text-gray-800 dark:text-white/90"
              aria-live="polite"
            >
              {new Intl.DateTimeFormat("en-GB", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(visibleMonth)}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={!monthHasAvailableDate(nextMonth)}
              onClick={() => setVisibleMonth(nextMonth)}
              className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ChevronLeftIcon className="size-4 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1" role="grid">
            {DAY_LABELS.map((day) => (
              <span
                key={day}
                role="columnheader"
                className="flex h-7 items-center justify-center text-[11px] font-semibold uppercase text-gray-400"
              >
                {day}
              </span>
            ))}
            {calendarDays.map((date) => {
              const isoDate = toIsoDate(date);
              const isSelected = isoDate === selectedValue;
              const isToday = isoDate === today;
              const isOutsideMonth =
                date.getUTCMonth() !== visibleMonth.getUTCMonth();
              const unavailable = isUnavailable(isoDate);

              return (
                <button
                  type="button"
                  role="gridcell"
                  key={isoDate}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  disabled={unavailable}
                  onClick={() => selectDate(isoDate)}
                  className={`relative flex size-9 items-center justify-center rounded-lg text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                    isSelected
                      ? "bg-brand-500 text-gray-900 shadow-theme-xs hover:bg-brand-400"
                      : isOutsideMonth
                        ? "text-gray-300 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        : "text-gray-700 hover:bg-brand-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-white"
                  } ${unavailable ? "cursor-not-allowed opacity-30 hover:bg-transparent" : ""}`}
                >
                  {date.getUTCDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-brand-600 dark:bg-brand-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
            {allowClear && selectedValue ? (
              <button
                type="button"
                onClick={clearDate}
                className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={!canUseToday}
              onClick={() => selectDate(today)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-35 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              Today
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            closePicker();
            return;
          }
          const current = parseIsoDate(selectedValue);
          if (current) setVisibleMonth(monthStart(current));
          setIsOpen(true);
        }}
        className={className}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedValue
              ? "text-gray-800 dark:text-white/90"
              : "text-gray-400 dark:text-white/30"
          }`}
        >
          {selectedValue ? displayValue(selectedValue) : placeholder}
        </span>
        <CalenderIcon
          className={`size-[18px] shrink-0 ${
            isOpen ? "text-brand-600 dark:text-brand-400" : "text-gray-400"
          }`}
        />
      </button>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      {popup}
    </>
  );
}
