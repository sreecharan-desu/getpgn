/** Reference-counted body scroll lock — safe when multiple overlays stack. */
let lockCount = 0;
let savedOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount <= 0) return;
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
    savedOverflow = "";
  }
}

/** Clears a stuck scroll lock (e.g. after route changes). */
export function resetBodyScroll(): void {
  if (typeof document === "undefined") return;
  lockCount = 0;
  savedOverflow = "";
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
}
