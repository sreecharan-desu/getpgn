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

const THEME_TRANSITION_MS = 320;

/** Crossfade design tokens in sync — avoids the wireframe flash from circular view transitions. */
function runThemeTransition(update: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  if (reduced) {
    update();
    return;
  }

  root.classList.add("theme-transition");
  void root.offsetWidth;
  update();
  window.setTimeout(
    () => root.classList.remove("theme-transition"),
    THEME_TRANSITION_MS,
  );
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

  const toggleTheme = useCallback(() => {
      const next: ThemePreference = theme === "dark" ? "light" : "dark";
      runThemeTransition(() => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        applyThemePreference(next, { transition: false });
        setTheme(next);
      });
  }, [theme]);

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    label,
    Icon: theme === "dark" ? Sun : Moon,
  };
}
