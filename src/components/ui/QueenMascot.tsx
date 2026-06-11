"use client";

import React, { useId, useRef, useState, useCallback } from "react";
import { QueenMark3D } from "./QueenMark3D";

/**
 * GetPGN 3D queen mascot — animated hero version of the brand mark.
 * Depth comes from layered gradients; life from a gentle float/tilt.
 */
export const QueenMascot: React.FC<{ className?: string; interactive?: boolean }> = ({
  className = "",
  interactive = false,
}) => {
  const idPrefix = useId().replace(/:/g, "");
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
        <QueenMark3D idPrefix={idPrefix} className="gpq-svg" />
      </div>

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
`;

export default QueenMascot;
