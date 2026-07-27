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
import { CheckLineIcon, ChevronDownIcon } from "@/icons";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  opensUpward: boolean;
};

const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;
const MAX_MENU_HEIGHT = 256;

export default function Select({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
}: SelectProps) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const estimatedHeight = Math.min(
      options.length * 36 + 12,
      MAX_MENU_HEIGHT,
    );
    const spaceBelow =
      window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_PADDING;
    const opensUpward =
      spaceBelow < Math.min(estimatedHeight, 160) && spaceAbove > spaceBelow;
    const availableSpace = opensUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(
      48,
      Math.min(MAX_MENU_HEIGHT, availableSpace),
    );
    const width = Math.min(
      rect.width,
      window.innerWidth - VIEWPORT_PADDING * 2,
    );
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.left),
      window.innerWidth - width - VIEWPORT_PADDING,
    );

    setMenuPosition({
      left,
      top: opensUpward ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      width,
      maxHeight,
      opensUpward,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateMenuPosition]);

  const selectOption = (value: string) => {
    setSelectedValue(value);
    setIsOpen(false);
    onChange(value);
  };

  const menu =
    isOpen &&
    menuPosition &&
    createPortal(
      <div className="dashboard-shell contents">
        <div
          ref={menuRef}
          className="fixed z-[100001] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
            transform: menuPosition.opensUpward
              ? "translateY(-100%)"
              : undefined,
          }}
        >
          <div
            role="listbox"
            aria-label={placeholder}
            className="h-full overflow-y-auto custom-scrollbar"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={option.value}
                  onClick={() => selectOption(option.value)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    isSelected
                      ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {isSelected && (
                    <CheckLineIcon className="max-h-4 max-w-4 shrink-0 overflow-visible text-brand-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`dropdown-toggle flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-left text-[13px] shadow-theme-xs transition-colors hover:border-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:focus:border-brand-800 ${
          selectedOption
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-400"
        } ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDownIcon
          className={`max-h-[18px] max-w-[18px] shrink-0 overflow-visible text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand-500" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}
