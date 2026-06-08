import React from "react";

/** Deterministic monochrome palette stops (ink → graphite). */
const STOPS: [string, string][] = [
  ["#171717", "#404040"],
  ["#0a0a0a", "#383838"],
  ["#262626", "#525252"],
  ["#1f1f1f", "#4b4b4b"],
  ["#2b2b2b", "#5a5a5a"],
  ["#111111", "#3a3a3a"],
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** First two meaningful letters of a username (split on space/._-). */
function initialsOf(name: string): string {
  const clean = (name || "?").trim();
  if (!clean) return "?";
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Deterministic, monochrome user avatar generated from the username.
 * No external service, no deps — a graphite gradient disc with initials.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 40, className = "" }) => {
  const hash = hashString(name || "");
  const [from, to] = STOPS[hash % STOPS.length];
  const angle = hash % 360;
  const initials = initialsOf(name);

  return (
    <span
      aria-hidden="true"
      className={`inline-grid place-items-center rounded-full text-white font-semibold select-none shadow-[0_1px_2px_rgba(10,10,10,0.25)] ring-1 ring-black/5 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        letterSpacing: "-0.02em",
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
      }}
    >
      {initials}
    </span>
  );
};

export default UserAvatar;
