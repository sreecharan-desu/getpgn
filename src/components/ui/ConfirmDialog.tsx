"use client";

import React, { useEffect } from "react";
import { Spinner } from "./Spinner";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Set to `false` to hide the cancel button. */
  cancelLabel?: string | false;
  alternateLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  alternateLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onAlternate?: () => void;
}

/** Calm, accessible confirmation modal — replaces native confirm(). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  alternateLabel,
  destructive = false,
  loading = false,
  alternateLoading = false,
  onConfirm,
  onCancel,
  onAlternate,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading && !alternateLoading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, alternateLoading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="gp-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm gp-fade-in"
      onClick={() => !loading && !alternateLoading && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-paper p-6 shadow-[var(--shadow-modal)] gp-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-[16px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2.5">
          {onAlternate && alternateLabel ? (
            <button
              type="button"
              onClick={onAlternate}
              disabled={loading || alternateLoading}
              aria-busy={alternateLoading || undefined}
              className="btn-primary btn-sm"
            >
              {alternateLoading ? <Spinner size={14} /> : alternateLabel}
            </button>
          ) : null}
          {cancelLabel !== false ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading || alternateLoading}
              className="btn-secondary btn-sm"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || alternateLoading}
            aria-busy={loading || undefined}
            className={`btn-sm ${destructive ? "bg-danger text-paper hover:opacity-90" : "btn-primary"}`}
          >
            {loading ? <Spinner size={14} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
