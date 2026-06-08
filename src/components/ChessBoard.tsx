"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Chessground } from 'chessground';
import { Chess, SQUARES } from 'chess.js';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.cburnett.css';

import { Api } from 'chessground/api';
import { Key, Color, Dests } from 'chessground/types';

export type BoardTheme = 'slate' | 'classic' | 'forest' | 'ocean' | 'wine';

const BOARD_THEME_STORAGE_KEY = 'getpgn-board-theme';

const BOARD_THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: 'slate', label: 'Slate', light: '#eeeff2', dark: '#d4d4d8' },
  { id: 'classic', label: 'Classic brown', light: '#f0d9b5', dark: '#b58863' },
  { id: 'forest', label: 'Forest green', light: '#dee8de', dark: '#7d9a81' },
  { id: 'ocean', label: 'Ocean blue', light: '#dee8f2', dark: '#7399b8' },
  { id: 'wine', label: 'Wine', light: '#ece4e4', dark: '#a67b7b' },
];

function isBoardTheme(value: string | null): value is BoardTheme {
  return BOARD_THEMES.some((t) => t.id === value);
}

/** Read persisted board theme synchronously (client only). */
export function readBoardTheme(): BoardTheme {
  if (typeof window === 'undefined') return 'slate';
  try {
    const saved = localStorage.getItem(BOARD_THEME_STORAGE_KEY);
    if (isBoardTheme(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'slate';
}

export function persistBoardTheme(theme: BoardTheme) {
  try {
    localStorage.setItem(BOARD_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Shared hook — avoids post-mount theme flash / layout shift. Free users stay on slate. */
export function useBoardTheme(isPro = true): [BoardTheme, (theme: BoardTheme) => void] {
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => (isPro ? readBoardTheme() : 'slate'));

  useEffect(() => {
    if (!isPro) setBoardTheme('slate');
  }, [isPro]);

  const setTheme = (theme: BoardTheme) => {
    if (!isPro) return;
    setBoardTheme(theme);
    persistBoardTheme(theme);
  };
  return [boardTheme, setTheme];
}

interface BoardThemePickerProps {
  value: BoardTheme;
  onChange: (theme: BoardTheme) => void;
  className?: string;
  /** When true, omits bottom margin (for inline header placement). */
  inline?: boolean;
  /** Free plan — only slate is active; other swatches prompt upgrade. */
  locked?: boolean;
  onLockedClick?: () => void;
}

export function BoardThemePicker({
  value,
  onChange,
  className = '',
  inline = false,
  locked = false,
  onLockedClick,
}: BoardThemePickerProps) {
  const defaultTheme: BoardTheme = 'slate';

  return (
    <div
      className={`gp-board-theme-picker ${inline ? 'gp-board-theme-picker--inline' : ''} ${className}`}
      role="group"
      aria-label={locked ? 'Board color (Pro feature)' : 'Board color'}
    >
      {BOARD_THEMES.map((theme) => {
        const isLocked = locked && theme.id !== defaultTheme;
        const isSelected = locked ? theme.id === defaultTheme : value === theme.id;

        return (
          <button
            key={theme.id}
            type="button"
            className={`gp-board-swatch ${isLocked ? 'gp-board-swatch--locked' : ''}`}
            aria-label={isLocked ? `${theme.label} — Pro feature` : theme.label}
            aria-pressed={isSelected}
            aria-disabled={isLocked || undefined}
            title={isLocked ? `${theme.label} — Pro only` : theme.label}
            onClick={() => {
              if (isLocked) {
                onLockedClick?.();
                return;
              }
              onChange(theme.id);
            }}
            style={{
              background: `linear-gradient(135deg, ${theme.light} 0 50%, ${theme.dark} 50% 100%)`,
            }}
          >
            {isLocked && <Lock className="gp-board-swatch__lock" strokeWidth={2.5} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

interface ChessBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  lastMove?: [string, string] | null;
  checkSquare?: string | null;
  checkType?: 'check' | 'checkmate' | null;
  /** When true, pieces can be dragged to make legal moves. */
  interactive?: boolean;
  /** Fired with the from/to squares of a legal drag. */
  onMove?: (from: string, to: string) => void;
  /** Max width of the framed board (default 100%). */
  maxWidth?: number | string;
  /** Show a-h / 1-8 coordinate labels. */
  coordinates?: boolean;
  /** Controlled board color theme. */
  boardTheme?: BoardTheme;
  /** Show swatches above the board (use BoardThemePicker in header when false). */
  showColorPicker?: boolean;
  className?: string;
}

/** Compute legal-move destinations for the side to move from a FEN. */
function legalDests(fen: string): { dests: Dests; turn: Color; inCheck: boolean } {
  const dests: Dests = new Map();
  let turn: Color = 'white';
  let inCheck = false;
  try {
    const chess = new Chess(fen);
    turn = chess.turn() === 'w' ? 'white' : 'black';
    inCheck = chess.inCheck();
    for (const sq of SQUARES) {
      const moves = chess.moves({ square: sq, verbose: true });
      if (moves.length) dests.set(sq as Key, moves.map((m) => m.to as Key));
    }
  } catch {
    /* invalid fen — no dests */
  }
  return { dests, turn, inCheck };
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation = 'white',
  lastMove = null,
  checkSquare = null,
  checkType = null,
  interactive = false,
  onMove,
  maxWidth = '100%',
  coordinates = true,
  boardTheme: boardThemeProp,
  showColorPicker = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cgRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const [internalTheme, setInternalTheme] = useState<BoardTheme>(readBoardTheme);
  const boardTheme = boardThemeProp ?? internalTheme;

  const pickTheme = (theme: BoardTheme) => {
    if (boardThemeProp === undefined) setInternalTheme(theme);
    persistBoardTheme(theme);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    cgRef.current = Chessground(el, {
      fen,
      orientation,
      viewOnly: !interactive,
      coordinates,
      lastMove: (lastMove as Key[]) || undefined,
      animation: { enabled: true, duration: 220 },
      highlight: { lastMove: true, check: true },
      draggable: {
        enabled: interactive,
        showGhost: true,
        deleteOnDropOff: false,
      },
    });

    const ro = new ResizeObserver(() => {
      cgRef.current?.redrawAll();
    });
    ro.observe(el);

    const raf = requestAnimationFrame(() => cgRef.current?.redrawAll());

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cgRef.current?.destroy();
      cgRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cgRef.current) return;

    let dests: Dests = new Map();
    let turn: Color = 'white';
    let inCheck = false;

    if (interactive) {
      ({ dests, turn, inCheck } = legalDests(fen));
    } else {
      try {
        const chess = new Chess(fen);
        turn = chess.turn() === 'w' ? 'white' : 'black';
        inCheck = chess.inCheck();
      } catch {
        /* invalid fen */
      }
    }

    const checkColor: Color | boolean = inCheck ? turn : false;

    const shapes = [];
    if (checkSquare && checkType === 'checkmate') {
      shapes.push({
        orig: checkSquare as Key,
        dest: checkSquare as Key,
        brush: 'red' as const,
      });
    }

    cgRef.current.set({
      fen,
      orientation,
      viewOnly: !interactive,
      coordinates,
      lastMove: (lastMove as Key[]) || undefined,
      turnColor: turn,
      check: checkColor,
      animation: { enabled: true, duration: 220 },
      highlight: { lastMove: true, check: true },
      draggable: {
        enabled: interactive,
        showGhost: true,
        deleteOnDropOff: false,
      },
      movable: interactive
        ? {
            free: false,
            color: turn,
            dests,
            showDests: true,
            events: {
              after: (orig: Key, dest: Key) => onMoveRef.current?.(orig, dest),
            },
          }
        : { free: false, color: undefined, dests: new Map(), showDests: false },
      drawable: { shapes },
    });
  }, [fen, orientation, lastMove, checkSquare, checkType, interactive, coordinates]);

  return (
    <div
      className={`gp-chess-board w-full ${className}`}
      data-board-theme={boardTheme}
      suppressHydrationWarning
      style={{ maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }}
    >
      {showColorPicker && (
        <BoardThemePicker
          value={boardTheme}
          onChange={(t) => {
            pickTheme(t);
            if (boardThemeProp === undefined) setInternalTheme(t);
          }}
        />
      )}
      <div className="gp-chess-board__frame">
        <div ref={containerRef} className="cg-board-container gp-chess-board__surface" />
      </div>
    </div>
  );
};
