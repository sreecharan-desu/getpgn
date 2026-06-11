"use client";

import React from "react";
import { avatarGradientForName } from "@/lib/playerAvatar";

type PlayerAvatarProps = {
  name: string;
  size?: number;
  className?: string;
  title?: string;
};

export function PlayerAvatar({
  name,
  size = 36,
  className = "",
  title,
}: PlayerAvatarProps) {
  const { from, to, angle, initials } = avatarGradientForName(name);

  return (
    <span
      title={title ?? name}
      aria-label={name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-2 ring-paper ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        letterSpacing: "-0.03em",
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
      }}
    >
      {initials}
    </span>
  );
}
