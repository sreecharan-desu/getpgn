"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, X, Search } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface ImageZoomProps {
  src: string;
  alt: string;
  /** Classes applied to the inline thumbnail image. */
  imgClassName?: string;
}

/**
 * Inline image that opens an accessible, dark-scrim lightbox on click.
 * Supports +/- zoom controls and click-to-toggle 1x/2x; resets on close.
 */
export const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt, imgClassName = "" }) => {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const close = useCallback(() => {
    setOpen(false);
    setScale(1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/zoom relative block w-full cursor-zoom-in"
        aria-label="Zoom scoresheet image"
        title="Click to zoom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imgClassName} />
        <span className="pointer-events-none absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-line-strong bg-paper/85 text-muted opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/zoom:opacity-100">
          <Search className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div
          className="gp-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm gp-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Scoresheet zoom"
          onClick={close}
        >
          <div
            className="absolute right-4 top-4 z-10 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(1, +(s - 0.5).toFixed(2)))}
              disabled={scale <= 1}
              aria-label="Zoom out"
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, +(s + 0.5).toFixed(2)))}
              disabled={scale >= 3}
              aria-label="Zoom in"
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={close}
              autoFocus
              aria-label="Close zoom"
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-full max-w-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={() => setScale((s) => (s === 1 ? 2 : 1))}
              style={{ transform: `scale(${scale})`, transformOrigin: "center top" }}
              className={`max-h-[88vh] w-auto max-w-[92vw] select-none rounded-lg shadow-2xl transition-transform duration-200 ${scale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImageZoom;
