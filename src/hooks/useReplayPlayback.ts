import { useCallback, useEffect, useState } from "react";

export interface ReplayPlaybackControls {
  isPlaying: boolean;
  playSpeed: number;
  setPlaySpeed: (speed: number) => void;
  togglePlay: () => void;
  handleFirst: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleLast: () => void;
  stopPlaying: () => void;
}

export function useReplayPlayback({
  currentPlyIndex,
  totalPlies,
  onSelectPly,
}: {
  currentPlyIndex: number;
  totalPlies: number;
  onSelectPly: (plyIndex: number) => void;
}): ReplayPlaybackControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (currentPlyIndex < totalPlies) onSelectPly(currentPlyIndex + 1);
      else setIsPlaying(false);
    }, playSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, currentPlyIndex, totalPlies, playSpeed, onSelectPly]);

  const selectPly = useCallback(
    (plyIndex: number) => {
      setIsPlaying(false);
      onSelectPly(plyIndex);
    },
    [onSelectPly],
  );

  const handleFirst = useCallback(() => selectPly(0), [selectPly]);
  const handlePrev = useCallback(() => {
    if (currentPlyIndex > 0) selectPly(currentPlyIndex - 1);
  }, [currentPlyIndex, selectPly]);
  const handleNext = useCallback(() => {
    if (currentPlyIndex < totalPlies) selectPly(currentPlyIndex + 1);
  }, [currentPlyIndex, totalPlies, selectPly]);
  const handleLast = useCallback(() => selectPly(totalPlies), [selectPly, totalPlies]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (currentPlyIndex >= totalPlies) onSelectPly(0);
    setIsPlaying(true);
  }, [isPlaying, currentPlyIndex, totalPlies, onSelectPly]);

  return {
    isPlaying,
    playSpeed,
    setPlaySpeed,
    togglePlay,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    stopPlaying: () => setIsPlaying(false),
  };
}
