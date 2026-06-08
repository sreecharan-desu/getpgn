"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  isMuted,
  subscribeSoundState,
  toggleMuted,
  unlockAudio,
} from "@/lib/chessSounds";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className = "" }: SoundToggleProps) {
  const muted = useSyncExternalStore(
    subscribeSoundState,
    isMuted,
    () => false,
  );

  return (
    <button
      type="button"
      className={`btn-ghost grid h-9 w-9 place-items-center rounded-lg p-0 ${className}`}
      onClick={() => {
        unlockAudio();
        toggleMuted();
      }}
      title={muted ? "Unmute move sounds" : "Mute move sounds"}
      aria-label={muted ? "Unmute move sounds" : "Mute move sounds"}
      aria-pressed={muted}
    >
      {muted ? (
        <VolumeX className="h-[18px] w-[18px]" />
      ) : (
        <Volume2 className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
