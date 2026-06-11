import React from "react";

export interface QueenMark3DProps extends React.SVGProps<SVGSVGElement> {
  /** Prefix gradient ids when multiple marks render on one page. */
  idPrefix?: string;
}

/**
 * Static glossy 3D chess queen — shared by Logo, QueenMascot, and /public favicon assets.
 */
export const QueenMark3D: React.FC<QueenMark3DProps> = ({
  idPrefix = "gpq",
  className,
  ...props
}) => {
  const p = idPrefix;
  return (
    <svg
      viewBox="0 0 240 300"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={`${p}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#525257" />
          <stop offset="34%" stopColor="#262629" />
          <stop offset="100%" stopColor="#060607" />
        </linearGradient>
        <radialGradient id={`${p}-spec`} cx="36%" cy="24%" r="58%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-rim`} cx="84%" cy="62%" r="44%">
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#cfd2da" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`${p}-crown`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3c3c40" />
          <stop offset="100%" stopColor="#050506" />
        </linearGradient>
        <radialGradient id={`${p}-bead`} cx="34%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#8a8a90" />
          <stop offset="42%" stopColor="#2a2a2d" />
          <stop offset="100%" stopColor="#050506" />
        </radialGradient>
        <linearGradient id={`${p}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="100%" stopColor="#070708" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="270" rx="64" ry="14" fill={`url(#${p}-base)`} />
      <rect x="60" y="246" width="120" height="20" rx="10" fill={`url(#${p}-base)`} />
      <rect x="72" y="236" width="96" height="14" rx="7" fill={`url(#${p}-crown)`} />

      <path
        d="M80 100 C70 128 58 156 56 192 C54 230 84 250 120 250 C156 250 186 230 184 192 C182 156 170 128 160 100 Z"
        fill={`url(#${p}-body)`}
      />
      <path
        d="M80 100 C70 128 58 156 56 192 C54 230 84 250 120 250 C156 250 186 230 184 192 C182 156 170 128 160 100 Z"
        fill={`url(#${p}-rim)`}
      />
      <path
        d="M80 100 C70 128 58 156 56 192 C54 230 84 250 120 250 C156 250 186 230 184 192 C182 156 170 128 160 100 Z"
        fill={`url(#${p}-spec)`}
      />
      <path
        d="M96 110 C90 150 88 196 94 236 C98 238 104 238 108 235 C103 196 104 150 110 112 C105 109 100 109 96 110 Z"
        fill="#ffffff"
        opacity="0.16"
      />

      <rect x="74" y="86" width="92" height="16" rx="8" fill={`url(#${p}-crown)`} />
      <rect x="74" y="86" width="92" height="6" rx="3" fill="#ffffff" opacity="0.14" />

      <path
        d="M70 88 L76 54 L94 70 L100 42 L113 70 L120 36 L127 70 L140 42 L146 70 L164 54 L170 88 Z"
        fill={`url(#${p}-crown)`}
      />

      {[
        { cx: 76, cy: 52, r: 7.5 },
        { cx: 100, cy: 40, r: 7.5 },
        { cx: 120, cy: 33, r: 9 },
        { cx: 140, cy: 40, r: 7.5 },
        { cx: 164, cy: 52, r: 7.5 },
      ].map((b, i) => (
        <g key={i}>
          <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${p}-bead)`} />
          <circle
            cx={b.cx - b.r * 0.32}
            cy={b.cy - b.r * 0.36}
            r={b.r * 0.26}
            fill="#ffffff"
            opacity="0.7"
          />
        </g>
      ))}
    </svg>
  );
};

export default QueenMark3D;
