"use client";

import { useThemeToggle } from "@/hooks/useThemeToggle";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme, label, Icon } = useThemeToggle();

  return (
    <button
      type="button"
      onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
      className={`btn-ghost grid h-9 w-9 place-items-center rounded-lg p-0 ${className}`}
      title={label}
      aria-label="Toggle theme"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
