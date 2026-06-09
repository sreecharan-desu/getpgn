"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { ChessBoard, BoardThemePicker, useBoardTheme } from '@/components/ChessBoard';
import { MoveList, Turn } from '@/components/MoveList';
import { ExportPanel } from '@/components/ExportPanel';
import { MobileShareBar } from '@/components/MobileShareBar';
import { Logo } from '@/components/ui/Logo';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { useChessPlySounds } from '@/hooks/useChessPlySounds';
import { Link2, ArrowUpRight, RotateCw, Check } from 'lucide-react';
import { applyThemePreference, getStoredThemePreference } from '@/lib/theme';
import {
  START_FEN,
  getBoardFenForPly,
  getLastMoveForPly,
  getCheckPlyForDisplay,
} from '@/lib/board-position';

// Older saved games may contain a duplicate header block and/or ugly all-`?`
// placeholder tags. Keep only the first contiguous run of [...] tag lines as
// the header, drop pure-placeholder tags, emit a real Date from createdAt, and
// append the movetext as a single clean line.
function cleanPgn(raw: string, createdAt?: string): string {
  const lines = (raw ?? '').split('\n');
  const header: string[] = [];
  const movetext: string[] = [];
  let seenHeader = false;
  let headerDone = false;

  const formatDate = (iso?: string): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  const realDate = formatDate(createdAt);

  for (const line of lines) {
    const trimmed = line.trim();
    const isTag = trimmed.startsWith('[');
    if (isTag) {
      if (!headerDone) {
        const match = trimmed.match(/^\[(\w+)\s+"(.*)"\]$/);
        const tag = match?.[1];
        const value = match?.[2] ?? '';

        // Drop pure-placeholder tags (e.g. Round/White/Black "?").
        if (value === '?') {
          seenHeader = true;
          continue;
        }
        // Replace placeholder/real Date with one derived from createdAt.
        if (tag === 'Date') {
          if (realDate) header.push(`[Date "${realDate}"]`);
          else if (value !== '????.??.??') header.push(trimmed);
          seenHeader = true;
          continue;
        }
        header.push(trimmed);
        seenHeader = true;
      }
      // subsequent tag lines (duplicate header blocks) are dropped
      continue;
    }
    // first non-tag line after a header run closes the header block
    if (seenHeader) headerDone = true;
    movetext.push(line);
  }

  const headerBlock = header.join('\n');
  // Collapse chess.js's ~80-column hard wraps in the movetext into single
  // spaces so each move number stays with its replies. Tokens are preserved
  // exactly (including the trailing result token like *, 1-0, 0-1, 1/2-1/2).
  const moves = movetext.join(' ').replace(/\s+/g, ' ').trim();
  if (!headerBlock) return moves;
  return moves ? `${headerBlock}\n\n${moves}` : headerBlock;
}

// Deterministic, locale- and timezone-independent date formatting so the
// server-rendered HTML always matches the client (avoids hydration mismatch).
const SHARE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatSharedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${SHARE_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

interface ShareClientProps {
  title: string;
  pgn: string;
  movesJson: string;
  createdAt: string;
}

export default function ShareClient({ title, pgn, movesJson, createdAt }: ShareClientProps) {
  const turns: Turn[] = JSON.parse(movesJson);
  const cleanedPgn = cleanPgn(pgn, createdAt);
  const downloadFileName = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game'}.pgn`;
  const [currentPlyIndex, setCurrentPlyIndex] = useState<number>(0);
  useChessPlySounds(turns, currentPlyIndex, turns.length > 0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useBoardTheme(true);
  const boardCardRef = useRef<HTMLDivElement>(null);
  const [boardCardHeight, setBoardCardHeight] = useState<number | null>(null);

  useEffect(() => {
    const syncTheme = () => {
      applyThemePreference(getStoredThemePreference(), { transition: false });
    };
    syncTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
      if (getStoredThemePreference() === 'system') syncTheme();
    };
    media.addEventListener('change', onSystemThemeChange);
    return () => media.removeEventListener('change', onSystemThemeChange);
  }, []);

  useLayoutEffect(() => {
    const el = boardCardRef.current;
    if (!el) return;
    const update = () => setBoardCardHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentPlyIndex, boardOrientation, turns.length]);

  const totalPlies = turns.length * 2;

  const findKingSquare = (fen: string, color: 'w' | 'b'): string | null => {
    const boardPart = fen.split(' ')[0];
    const rows = boardPart.split('/');
    const target = color === 'w' ? 'K' : 'k';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
      const rowStr = rows[r];
      let fileIdx = 0;
      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        if (char === target) {
          const rank = 8 - r;
          return `${files[fileIdx]}${rank}`;
        }
        if (/\d/.test(char)) fileIdx += parseInt(char, 10);
        else fileIdx++;
      }
    }
    return null;
  };

  const getBoardFen = () => getBoardFenForPly(turns, currentPlyIndex, START_FEN);

  const getCheckHighlight = () => {
    const checkPly = getCheckPlyForDisplay(turns, currentPlyIndex);
    if (!checkPly) return null;
    const { ply, player } = checkPly;
    const isCheckmate = ply.san!.endsWith('#');
    const isCheck = ply.san!.endsWith('+');
    if (isCheckmate || isCheck) {
      const kingSq = findKingSquare(getBoardFen(), player === 'white' ? 'b' : 'w');
      if (kingSq) return { square: kingSq, type: isCheckmate ? ('checkmate' as const) : ('check' as const) };
    }
    return null;
  };

  const getLastMove = () => getLastMoveForPly(turns, currentPlyIndex);

  const getBoardStatus = () => {
    const fen = getBoardFen();
    const sideToMove = fen.split(' ')[1] === 'w' ? 'White' : 'Black';
    const checkInfo = getCheckHighlight();
    const positionLabel =
      currentPlyIndex === 0
        ? 'Start position'
        : `Ply ${currentPlyIndex} of ${totalPlies}`;
    return { sideToMove, checkInfo, positionLabel };
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink selection:bg-ink selection:text-paper">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 px-5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
          <Link href="/" className="group/logo inline-flex rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2">
            <Logo wordmarkSize="md" />
          </Link>
          <Link href="/" className="btn-primary btn-sm">
            Create your own <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 md:px-6 md:py-8">
        <div className="mb-4 shrink-0 space-y-1">
          <h1 className="truncate text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink">
            {title}
          </h1>
          <p className="text-[12px] text-muted">
            Shared on {formatSharedDate(createdAt)}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 pb-2">
          {/* Toolbar — mirrors dashboard review workspace */}
          <div className="card flex shrink-0 items-center justify-between px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
              <Link2 className="h-3 w-3" /> Public replay
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-positive-bg px-2.5 py-1 text-[11px] font-medium text-positive">
              <Check className="h-3 w-3" /> Validated game
            </span>
          </div>

          <MobileShareBar
            variant="public"
            pgn={cleanedPgn}
            downloadFileName={downloadFileName}
          />

          {/* panel grid — mobile: board → move sheet → PGN; lg: board+PGN | move sheet */}
          <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.98fr)]">
            {/* Board */}
            <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
              <div ref={boardCardRef} className="card shrink-0 overflow-hidden p-0">
                <div className="space-y-2.5 border-b border-line px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[15px] font-semibold text-ink">Visual replay</h3>
                    <button
                      type="button"
                      onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
                      className="btn-secondary btn-sm shrink-0 px-2.5 sm:px-3"
                      title="Flip board perspective"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Flip board</span>
                    </button>
                  </div>
                  {(() => {
                    const { sideToMove, checkInfo, positionLabel } = getBoardStatus();
                    return (
                      <>
                        <p className="min-h-[18px] text-[12px] leading-snug text-muted">
                          <span className="gp-nums">{positionLabel}</span>
                          <span aria-hidden="true" className="text-muted-2">
                            {' '}
                            ·{' '}
                          </span>
                          <span>{sideToMove} to move</span>
                          {checkInfo ? (
                            <span
                              className={`ml-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold align-middle ${
                                checkInfo.type === 'checkmate'
                                  ? 'border-[#fbcfe3] bg-danger-bg text-danger'
                                  : 'border-amber-200 bg-warn-bg text-warn'
                              }`}
                            >
                              {checkInfo.type === 'checkmate' ? 'Checkmate' : 'Check'}
                            </span>
                          ) : null}
                        </p>
                        <div className="flex items-center gap-2">
                          <BoardThemePicker
                            value={boardTheme}
                            onChange={setBoardTheme}
                            inline
                            className="!justify-start"
                          />
                          <SoundToggle />
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-surface px-3 py-3 sm:px-4 sm:py-4">
                  <ChessBoard
                    fen={getBoardFen()}
                    orientation={boardOrientation}
                    lastMove={getLastMove()}
                    checkSquare={getCheckHighlight()?.square}
                    checkType={getCheckHighlight()?.type}
                    boardTheme={boardTheme}
                    showColorPicker={false}
                    maxWidth="100%"
                  />
                </div>
              </div>
            </div>

            {/* Move sheet — directly under board on mobile; right column on lg */}
            <div className="order-2 flex min-w-0 flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:row-span-3">
              <div
                className="flex h-[min(420px,45vh)] min-h-0 flex-col overflow-hidden lg:h-auto lg:min-h-[280px]"
                style={
                  boardCardHeight != null && boardCardHeight > 0
                    ? { height: boardCardHeight }
                    : undefined
                }
              >
                <MoveList
                  turns={turns}
                  currentPlyIndex={currentPlyIndex}
                  onSelectPly={setCurrentPlyIndex}
                  readOnly
                  shareReplay
                />
              </div>
            </div>

            <div className="order-4 hidden min-w-0 lg:col-start-1 lg:row-start-3 lg:block">
              <ExportPanel
                section="pgn"
                pgn={cleanedPgn}
                gameIsValid
                isPaid
                gameId={null}
              />
            </div>
          </div>
        </div>

        {/* Conversion CTA */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[16px] border border-line bg-surface px-6 py-6 text-center sm:mt-8 sm:flex-row sm:text-left">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Digitize your own scoresheets</h3>
            <p className="mt-0.5 text-[13px] text-muted">Turn a photo or PGN into a validated, shareable game in seconds.</p>
          </div>
          <Link href="/" className="btn-primary btn-md shrink-0">
            Try GetPGN free <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line bg-paper px-5 py-6 text-center text-[12px] text-muted-2">
        <p>© {new Date().getFullYear()} GetPGN — Chess scoresheet digitizer</p>
        <p className="mt-2 text-muted">
          <Link href="/privacy" className="legal-link">Privacy</Link>
          {" · "}
          <Link href="/refund" className="legal-link">Refunds</Link>
        </p>
      </footer>
    </div>
  );
}
