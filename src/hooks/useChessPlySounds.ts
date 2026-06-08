"use client";

import { useEffect, useRef } from "react";
import { playMoveSoundForPly, type TurnLike } from "@/lib/chessSounds";

/** Play a move sound whenever the replay ply index changes (skip initial mount). */
export function useChessPlySounds(
  turns: TurnLike[],
  currentPlyIndex: number,
  enabled = true,
): void {
  const prevPlyRef = useRef(currentPlyIndex);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!enabled || turns.length === 0) {
      prevPlyRef.current = currentPlyIndex;
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      prevPlyRef.current = currentPlyIndex;
      return;
    }

    if (prevPlyRef.current !== currentPlyIndex && currentPlyIndex > 0) {
      playMoveSoundForPly(turns, currentPlyIndex);
    }

    prevPlyRef.current = currentPlyIndex;
  }, [currentPlyIndex, turns, enabled]);
}
