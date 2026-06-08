"use client";

import React, { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { Spinner } from "./Spinner";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export function FeedbackModal({ open, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setHover(0);
    setComment("");
    setError(null);
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const active = hover || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(rating, comment.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send feedback. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="gp-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[8px] gp-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={() => !loading && onClose()}
    >
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-[20px] border border-line bg-paper shadow-[var(--shadow-modal)] gp-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-2">Feedback</p>
          <h2 id="feedback-title" className="mt-2 pr-8 text-[18px] font-semibold tracking-tight text-ink">
            How&apos;s GetPGN?
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Your rating helps us improve digitizing and the review experience.
          </p>

          <div className="mt-6 flex justify-center gap-1.5" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                disabled={loading}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(value)}
                className="cursor-pointer rounded-lg p-1 transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    value <= active
                      ? "fill-ink text-ink"
                      : "fill-transparent text-line-strong"
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>

          <label htmlFor="feedback-comment" className="mt-6 block text-[12px] font-medium text-ink">
            Comment
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            rows={4}
            maxLength={2000}
            placeholder="What worked well? What should we improve?"
            className="mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink placeholder:text-muted-2 transition-colors focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-ink/5 disabled:opacity-60"
          />

          {error ? (
            <p className="mt-3 text-[12px] text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary btn-sm flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating < 1}
              aria-busy={loading || undefined}
              className="btn-primary btn-sm flex-1"
            >
              {loading ? <Spinner size={14} /> : "Send feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
