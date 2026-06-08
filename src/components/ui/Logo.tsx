import React from "react";

interface LogoProps {
  className?: string;
  wordmarkSize?: "sm" | "md" | "lg";
}

const WORDMARK_SIZE = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[20px]",
} as const;

/** GetPGN wordmark — Audiowide only. Queen mark lives in /public/favicon.svg (site icon). */
export const Logo: React.FC<LogoProps> = ({ className = "", wordmarkSize = "md" }) => (
  <span
    className={`gp-wordmark group/logo inline-flex select-none items-baseline font-[family-name:var(--font-audiowide)] font-normal tracking-[0.05em] ${WORDMARK_SIZE[wordmarkSize]} ${className}`}
  >
    <span className="text-ink transition-colors group-hover/logo:text-ink">Get</span>
    <span className="text-muted transition-colors group-hover/logo:text-muted-2">PGN</span>
  </span>
);

export default Logo;
