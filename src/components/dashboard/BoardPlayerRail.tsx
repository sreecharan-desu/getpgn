"use client";

import React from "react";
import { Pencil } from "lucide-react";

interface BoardPlayerRailProps {
  name: string;
  position: "top" | "bottom";
  onEdit?: () => void;
  canEdit?: boolean;
}

/** Player name shown above or below the review board. */
export function BoardPlayerRail({
  name,
  position,
  onEdit,
  canEdit = false,
}: BoardPlayerRailProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-2 px-1 ${
        position === "top" ? "mb-2.5" : "mt-2.5"
      }`}
    >
      <p
        className="min-w-0 truncate text-center text-[13px] font-semibold tracking-tight text-ink sm:text-[14px]"
        title={name}
      >
        {name}
      </p>
      {canEdit && onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-paper text-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink cursor-pointer"
          aria-label={`Edit ${name}`}
          title="Edit players and title"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
