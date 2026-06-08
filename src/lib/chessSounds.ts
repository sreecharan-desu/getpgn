"use client";

/**
 * GetPGN chess move sounds — Kenney UI Audio (CC0 1.0).
 * @see docs/chess-sounds.md
 * @see public/sounds/chess/LICENSE.txt
 */

import { Chess } from "chess.js";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type ChessSoundEvent =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promotion"
  | "gameEnd";

export interface MoveSoundInfo {
  fenBefore: string;
  san?: string | null;
  uci?: string | null;
}

export interface PlyLike {
  san: string | null;
  uci: string | null;
  fen: string | null;
}

export interface TurnLike {
  white: PlyLike;
  black: PlyLike;
}

const MUTE_STORAGE_KEY = "getpgn-chess-sounds-muted";

/** Kenney UI Audio (CC0) — https://kenney.nl/assets/ui-audio */
const SOUND_URLS: Record<ChessSoundEvent, string> = {
  move: "/sounds/chess/move.wav", // click1.wav
  capture: "/sounds/chess/capture.wav", // click2.wav
  check: "/sounds/chess/check.wav", // switch14.wav
  castle: "/sounds/chess/castle.wav", // switch7.wav
  promotion: "/sounds/chess/promotion.wav", // switch9.wav
  gameEnd: "/sounds/chess/game-end.wav", // click3.wav
};

/** Per-event gain — kept low for a subtle, premium feel. */
const SOUND_VOLUMES: Record<ChessSoundEvent, number> = {
  move: 0.22,
  capture: 0.28,
  check: 0.32,
  castle: 0.26,
  promotion: 0.3,
  gameEnd: 0.28,
};

const audioCache = new Map<ChessSoundEvent, HTMLAudioElement>();
let activePlayback: HTMLAudioElement | null = null;
let audioUnlocked = false;
let muted = false;
const listeners = new Set<() => void>();

function readStoredMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  muted = readStoredMuted();
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

export function subscribeSoundState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  }
  if (value && activePlayback) {
    activePlayback.pause();
    activePlayback.currentTime = 0;
    activePlayback = null;
  }
  notifyListeners();
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

function getCachedAudio(event: ChessSoundEvent): HTMLAudioElement {
  let audio = audioCache.get(event);
  if (!audio) {
    audio = new Audio(SOUND_URLS[event]);
    audio.preload = "auto";
    audioCache.set(event, audio);
  }
  return audio;
}

export function preloadSounds(): void {
  if (typeof window === "undefined") return;
  (Object.keys(SOUND_URLS) as ChessSoundEvent[]).forEach((event) => {
    getCachedAudio(event).load();
  });
}

/** Call after a user gesture so autoplay policies allow playback. */
export function unlockAudio(): void {
  if (typeof window === "undefined" || audioUnlocked) return;
  audioUnlocked = true;
  preloadSounds();

  const probe = getCachedAudio("move");
  const previousVolume = probe.volume;
  probe.volume = 0;
  probe.currentTime = 0;
  probe
    .play()
    .catch(() => {
      /* Browser may still block until a later gesture — degrade silently. */
    })
    .finally(() => {
      probe.pause();
      probe.currentTime = 0;
      probe.volume = previousVolume;
    });
}

if (typeof window !== "undefined") {
  const onFirstInteraction = () => unlockAudio();
  window.addEventListener("pointerdown", onFirstInteraction, {
    once: true,
    passive: true,
  });
  window.addEventListener("keydown", onFirstInteraction, {
    once: true,
    passive: true,
  });
}

export function getPlyAt(turns: TurnLike[], plyIndex: number): PlyLike | null {
  if (plyIndex <= 0) return null;
  const turnIdx = Math.floor((plyIndex - 1) / 2);
  const player = (plyIndex - 1) % 2 === 0 ? "white" : "black";
  return turns[turnIdx]?.[player] ?? null;
}

export function getFenBeforePly(turns: TurnLike[], plyIndex: number): string {
  if (plyIndex <= 1) return START_FEN;
  for (let p = plyIndex - 1; p >= 1; p--) {
    const fen = getPlyAt(turns, p)?.fen;
    if (fen) return fen;
  }
  return START_FEN;
}

/** Priority: promotion > check > capture > castle > normal (+ optional game end). */
export function classifyMoveSound(info: MoveSoundInfo): ChessSoundEvent {
  try {
    const chess = new Chess(info.fenBefore);
    let move;

    if (info.uci && info.uci.length >= 4) {
      move = chess.move({
        from: info.uci.slice(0, 2),
        to: info.uci.slice(2, 4),
        promotion: (info.uci[4] as "q" | "r" | "b" | "n" | undefined) || undefined,
      });
    } else if (info.san) {
      const cleaned = info.san.replace(/[+#]$/, "").trim();
      if (cleaned) move = chess.move(cleaned);
    }

    if (!move) return "move";

    if (move.promotion) return "promotion";
    if (chess.isCheckmate() || chess.isStalemate()) return "gameEnd";
    if (chess.inCheck()) return "check";
    if (move.flags.includes("c") || move.flags.includes("e")) return "capture";
    if (move.flags.includes("k") || move.flags.includes("q")) return "castle";
    return "move";
  } catch {
    return "move";
  }
}

function playEvent(event: ChessSoundEvent): void {
  if (typeof window === "undefined" || muted || !audioUnlocked) return;

  const audio = getCachedAudio(event);
  if (activePlayback && activePlayback !== audio) {
    activePlayback.pause();
    activePlayback.currentTime = 0;
  }

  audio.volume = SOUND_VOLUMES[event];
  audio.currentTime = 0;
  activePlayback = audio;
  audio.play().catch(() => {
    /* Autoplay or missing codec — ignore. */
  });
}

export function playMoveSound(info: MoveSoundInfo): void {
  playEvent(classifyMoveSound(info));
}

export function playMoveSoundForPly(turns: TurnLike[], plyIndex: number): void {
  const ply = getPlyAt(turns, plyIndex);
  if (!ply?.san && !ply?.uci) return;
  playMoveSound({
    fenBefore: getFenBeforePly(turns, plyIndex),
    san: ply.san,
    uci: ply.uci,
  });
}
