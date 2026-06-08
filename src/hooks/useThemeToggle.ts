"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  applyThemePreference,
  getStoredThemePreference,
  resolveIsDark,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

export type ThemeOrigin = { x: number; y: number };

function getTransitionRadius(x: number, y: number): number {
  const { innerWidth: w, innerHeight: h } = window;
  const distances = [
    Math.hypot(x, y),
    Math.hypot(w - x, y),
    Math.hypot(x, h - y),
    Math.hypot(w - x, h - y),
  ];
  return Math.max(...distances) + 24;
}

function runThemeViewTransition(update: () => void, origin?: ThemeOrigin) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  if (reduced || typeof document.startViewTransition !== "function") {
    update();
    if (!reduced) {
      root.classList.add("theme-transition");
      window.setTimeout(() => root.classList.remove("theme-transition"), 260);
    }
    return;
  }

  const x = origin?.x ?? window.innerWidth;
  const y = origin?.y ?? 0;
  root.style.setProperty("--theme-transition-x", `${x}px`);
  root.style.setProperty("--theme-transition-y", `${y}px`);
  root.style.setProperty("--theme-transition-r", `${getTransitionRadius(x, y)}px`);

  const transition = document.startViewTransition(() => {
    update();
  });

  void transition.finished.finally(() => {
    root.style.removeProperty("--theme-transition-x");
    root.style.removeProperty("--theme-transition-y");
    root.style.removeProperty("--theme-transition-r");
  });
}

export function useThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const syncTheme = useCallback(() => {
    const preference = getStoredThemePreference();
    const isDark = resolveIsDark(preference);
    applyThemePreference(preference, { transition: false });
    setTheme(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    syncTheme();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if (getStoredThemePreference() === "system") syncTheme();
    };

    media.addEventListener("change", onSystemThemeChange);
    return () => media.removeEventListener("change", onSystemThemeChange);
  }, [syncTheme]);

  const toggleTheme = useCallback(
    (origin?: ThemeOrigin) => {
      const next: ThemePreference = theme === "dark" ? "light" : "dark";
      runThemeViewTransition(() => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        applyThemePreference(next, { transition: false });
        setTheme(next);
      }, origin);
    },
    [theme],
  );

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    label,
    Icon: theme === "dark" ? Sun : Moon,
  };
}
