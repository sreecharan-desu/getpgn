"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";
import { defaultOrganizerLibraryTitle } from "@/lib/organizerLibrary";

type LibraryState = {
  slug: string;
  title: string;
  enabled: boolean;
};

export function OrganizerLibraryPanel({ username }: { username: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [library, setLibrary] = useState<LibraryState | null>(null);
  const [title, setTitle] = useState("");
  const [enabled, setEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/library/share");
      if (!res.ok) throw new Error(await readApiError(res, "Could not load library."));
      const data = (await res.json()) as { library: LibraryState | null };
      if (data.library) {
        setLibrary(data.library);
        setTitle(data.library.title || defaultOrganizerLibraryTitle(username));
        setEnabled(data.library.enabled);
      } else {
        setTitle(defaultOrganizerLibraryTitle(username));
      }
    } catch (err) {
      toast.error(friendlyError(err, "Could not load organizer library."));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/library/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, enabled }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Could not save library."));
      const data = (await res.json()) as {
        library: LibraryState;
        sharedTotal?: number;
      };
      setLibrary(data.library);
      if (enabled && typeof data.sharedTotal === "number") {
        toast.success(
          `Organizer library is live — ${data.sharedTotal.toLocaleString("en-IN")} game${data.sharedTotal === 1 ? "" : "s"} published`,
        );
      } else {
        toast.success(enabled ? "Organizer library is live" : "Library settings saved");
      }
    } catch (err) {
      toast.error(friendlyError(err, "Could not save library."));
    } finally {
      setSaving(false);
    }
  };

  const publicUrl =
    typeof window !== "undefined" && library?.slug
      ? `${window.location.origin}/library/${library.slug}`
      : library?.slug
        ? `/library/${library.slug}`
        : "";

  const publishAllGames = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/library/publish-games", { method: "POST" });
      if (!res.ok) throw new Error(await readApiError(res, "Could not publish games."));
      const data = (await res.json()) as { published: number; sharedTotal: number };
      if (data.published > 0) {
        toast.success(
          `Published ${data.published.toLocaleString("en-IN")} game${data.published === 1 ? "" : "s"} to your library`,
        );
      } else {
        toast.success(
          `All ${data.sharedTotal.toLocaleString("en-IN")} saved games are already in your library`,
        );
      }
    } catch (err) {
      toast.error(friendlyError(err, "Could not publish games."));
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      const full =
        publicUrl.startsWith("http") ? publicUrl : `${window.location.origin}${publicUrl}`;
      await navigator.clipboard.writeText(full);
      toast.success("Library link copied");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  if (loading) {
    return (
      <section className="gp-account-cal-section">
        <div className="gp-account-cal-row">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Spinner size={14} />
            Loading library settings…
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="gp-account-cal-section">
      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <p className="gp-account-cal-row__label">Organizer library</p>
          <p className="gp-account-cal-row__hint">
            Share a public link so viewers can browse your saved games. When enabled,
            saved games are published automatically.
          </p>
        </div>
      </div>

      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <p className="gp-account-cal-row__label">Library title</p>
          <p className="gp-account-cal-row__hint">
            Shown at the top of your public library page.
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={defaultOrganizerLibraryTitle(username)}
            className="input mt-3 h-10 w-full max-w-md text-[14px]"
          />
        </div>
      </div>

      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-line"
            />
            Enable public library link
          </label>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="gp-account-cal-row__action inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Spinner size={14} /> : null}
          Save library
        </button>
      </div>

      {library?.enabled && library.slug ? (
        <>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Publish games</p>
              <p className="gp-account-cal-row__hint">
                Games need a public share link before they appear on your library
                page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void publishAllGames()}
              disabled={publishing}
              className="gp-account-cal-row__action inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {publishing ? <Spinner size={14} /> : null}
              Publish all
            </button>
          </div>

          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Public link</p>
              <p className="gp-account-cal-row__hint">
                Share this URL so others can browse your games.
              </p>
              <p className="mt-2 truncate font-mono text-[13px] text-ink">{publicUrl}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="gp-account-cal-row__action inline-flex items-center gap-1"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
              <Link
                href={`/library/${library.slug}`}
                target="_blank"
                className="gp-account-cal-row__action inline-flex items-center gap-1"
              >
                Open
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
