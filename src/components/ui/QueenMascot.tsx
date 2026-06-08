"use client";

import React, { useRef, useState, useCallback } from "react";

/**
 * GetPGN 3D queen.
 *
 * A premium, glossy black chess queen rendered entirely from SVG + CSS (no
 * deps). Depth and the "3D render" feel come from layered linear/radial
 * gradients, specular highlights, a rim light and a soft contact shadow.
 * Life comes from a gentle GPU-friendly float/tilt. Purely decorative
 * (aria-hidden) and respects prefers-reduced-motion via the global rule.
 */
export const QueenMascot: React.FC<{ className?: string; interactive?: boolean }> = ({
  className = "",
  interactive = false,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ rx: -py * 14, ry: px * 18 });
    },
    [interactive],
  );

  const onLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ rx: 0, ry: 0 });
  }, []);

  const floatStyle =
    interactive && isHovering
      ? {
          transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-8px)`,
        }
      : undefined;

  return (
    <div
      ref={stageRef}
      className={`gpq-stage ${interactive ? "gpq-interactive" : ""} ${className}`}
      onMouseEnter={interactive ? () => setIsHovering(true) : undefined}
      onMouseMove={interactive ? onMove : undefined}
      onMouseLeave={interactive ? onLeave : undefined}
      aria-hidden="true"
    >
      <style>{css}</style>

      <div className="gpq-float" style={floatStyle}>
        <svg
          className="gpq-svg"
          viewBox="0 0 240 300"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
        >
          <defs>
            {/* Glossy black body */}
            <linearGradient id="gpq-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#525257" />
              <stop offset="34%" stopColor="#262629" />
              <stop offset="100%" stopColor="#060607" />
            </linearGradient>
            {/* Soft top-left specular bloom */}
            <radialGradient id="gpq-spec" cx="36%" cy="24%" r="58%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            {/* Right-edge rim light */}
            <radialGradient id="gpq-rim" cx="84%" cy="62%" r="44%">
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#cfd2da" stopOpacity="0.4" />
            </radialGradient>
            {/* Crown / collar */}
            <linearGradient id="gpq-crown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3c3c40" />
              <stop offset="100%" stopColor="#050506" />
            </linearGradient>
            {/* Glossy bead sphere */}
            <radialGradient id="gpq-bead" cx="34%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#8a8a90" />
              <stop offset="42%" stopColor="#2a2a2d" />
              <stop offset="100%" stopColor="#050506" />
            </radialGradient>
            {/* Base */}
            <linearGradient id="gpq-base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a3a3e" />
              <stop offset="100%" stopColor="#070708" />
            </linearGradient>
          </defs>

          {/* ── Base ── */}
          <ellipse cx="120" cy="270" rx="64" ry="14" fill="url(#gpq-base)" />
          <rect x="60" y="246" width="120" height="20" rx="10" fill="url(#gpq-base)" />
          <rect x="72" y="236" width="96" height="14" rx="7" fill="url(#gpq-crown)" />

          {/* ── Body bell ── */}
          <path
            d="M80 100 C70 128 58 156 56 192 C54 230 84 250 120 250 C156 250 186 230 184 192 C182 156 170 128 160 100 Z"
            fill="url(#gpq-body)"
          />
          <path
            d="M80 100 C70 128 58 156 56 192 C54 230 84 250 120 250 C156 250 186 230 184 192 C182 156 170 128 160 100 Z"
            fill="url(#gpq-rim)"
          />
          {/* Specular bloom (clipped to body) */}
          <path
            d="M80 100 C70 128 58 156 56 192 C54 230 84 250 120 250 C156 250 186 230 184 192 C182 156 170 128 160 100 Z"
            fill="url(#gpq-spec)"
          />
          {/* Vertical glossy streak */}
          <path
            className="gpq-streak"
            d="M96 110 C90 150 88 196 94 236 C98 238 104 238 108 235 C103 196 104 150 110 112 C105 109 100 109 96 110 Z"
            fill="#ffffff"
            opacity="0.16"
          />

          {/* ── Collar ── */}
          <rect x="74" y="86" width="92" height="16" rx="8" fill="url(#gpq-crown)" />
          <rect x="74" y="86" width="92" height="6" rx="3" fill="#ffffff" opacity="0.14" />

          {/* ── Crown coronet ── */}
          <path
            d="M70 88 L76 54 L94 70 L100 42 L113 70 L120 36 L127 70 L140 42 L146 70 L164 54 L170 88 Z"
            fill="url(#gpq-crown)"
          />

          {/* ── Crown beads (glossy spheres) ── */}
          {[
            { cx: 76, cy: 52, r: 7.5 },
            { cx: 100, cy: 40, r: 7.5 },
            { cx: 120, cy: 33, r: 9 },
            { cx: 140, cy: 40, r: 7.5 },
            { cx: 164, cy: 52, r: 7.5 },
          ].map((b, i) => (
            <g key={i}>
              <circle cx={b.cx} cy={b.cy} r={b.r} fill="url(#gpq-bead)" />
              <circle cx={b.cx - b.r * 0.32} cy={b.cy - b.r * 0.36} r={b.r * 0.26} fill="#ffffff" opacity="0.7" />
            </g>
          ))}
        </svg>
      </div>

      {/* Ground shadow */}
      <div className="gpq-shadow" />
    </div>
  );
};

const css = `
.gpq-stage {
  position: relative;
  width: 100%;
  max-width: 340px;
  aspect-ratio: 4 / 5;
  margin-inline: auto;
  display: grid;
  place-items: center;
  filter: drop-shadow(0 30px 46px rgba(8, 8, 10, 0.28));
}
.gpq-interactive {
  cursor: pointer;
}
.gpq-interactive .gpq-float {
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.gpq-interactive:hover .gpq-float {
  animation-play-state: paused;
}
.gpq-float {
  width: 80%;
  transform-origin: 50% 72%;
  animation: gpq-float 5s ease-in-out infinite;
  will-change: transform;
}
.gpq-svg { width: 100%; height: auto; display: block; }
.gpq-streak { animation: gpq-shimmer 5s ease-in-out infinite; }
.gpq-shadow {
  position: absolute;
  bottom: 5%;
  left: 50%;
  width: 50%;
  height: 7%;
  translate: -50% 0;
  border-radius: 999px;
  background: radial-gradient(closest-side, rgba(8,8,10,0.42), rgba(8,8,10,0));
  filter: blur(2px);
  animation: gpq-shadow 5s ease-in-out infinite;
  z-index: -1;
}

@keyframes gpq-float {
  0%, 100% { transform: translateY(0) rotate(-2.2deg); }
  50% { transform: translateY(-16px) rotate(2.2deg); }
}
@keyframes gpq-shadow {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(0.76); opacity: 0.2; }
}
@keyframes gpq-shimmer {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.22; }
}
`;

export default QueenMascot;
