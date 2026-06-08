import { THEME_STORAGE_KEY } from '@/lib/theme';

/** Keys written by the app outside the `getpgn:` workspace prefix. */
const APP_STORAGE_KEYS = [THEME_STORAGE_KEY, 'getpgn-board-theme'] as const;

/** Remove all GetPGN client state from localStorage. */
export function clearAppLocalStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('getpgn:') || key.startsWith('getpgn-')) {
        keysToRemove.push(key);
      }
    }

    for (const key of APP_STORAGE_KEYS) {
      keysToRemove.push(key);
    }

    [...new Set(keysToRemove)].forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

/** Clear local client state, destroy the session cookie, and land on home. */
export function forceLogout(): void {
  if (typeof window === 'undefined') return;
  clearAppLocalStorage();
  window.location.replace('/auth/logout');
}
