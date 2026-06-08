export const THEME_STORAGE_KEY = 'getpgn-theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return getSystemIsDark();
}

export function applyThemeToDocument(isDark: boolean, options?: { transition?: boolean }) {
  const root = document.documentElement;
  if (options?.transition) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 260);
  }
  root.classList.toggle('dark', isDark);
}

export function applyThemePreference(preference: ThemePreference, options?: { transition?: boolean }) {
  applyThemeToDocument(resolveIsDark(preference), options);
}

/** Inline script for layout.tsx — must stay in sync with resolveIsDark(). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList[d?'add':'remove']('dark');}catch(e){}})();`;
