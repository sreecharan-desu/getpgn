"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChessBoard, BoardThemePicker, useBoardTheme } from '@/components/ChessBoard';
import { MoveList, Turn } from '@/components/MoveList';
import { Logo } from '@/components/ui/Logo';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { useChessPlySounds } from '@/hooks/useChessPlySounds';
import { Copy, Download, Link2, ArrowUpRight, Play, Pause, RotateCw } from 'lucide-react';
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
  const [currentPlyIndex, setCurrentPlyIndex] = useState<number>(0);
  useChessPlySounds(turns, currentPlyIndex, turns.length > 0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useBoardTheme(true);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const totalPlies = turns.length * 2;

  // Auto-advance the replay while playing (mirrors MoveList's ~1s cadence).
  useEffect(() => {
    if (!isPlaying) return;
    if (currentPlyIndex >= totalPlies) { setIsPlaying(false); return; }
    const id = setTimeout(() => setCurrentPlyIndex((i) => i + 1), 1000);
    return () => clearTimeout(id);
  }, [isPlaying, currentPlyIndex, totalPlies]);

  // Any manual navigation / ply selection stops playback for consistent behavior.
  const handleSelectPly = (index: number) => {
    setIsPlaying(false);
    setCurrentPlyIndex(index);
  };

  const togglePlay = () => {
    if (!isPlaying && currentPlyIndex >= totalPlies) setCurrentPlyIndex(0);
    setIsPlaying((p) => !p);
  };

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

  const copyPgn = async () => {
    try {
      await navigator.clipboard.writeText(cleanedPgn);
      toast.success('PGN copied to clipboard');
    } catch {
      toast.error('Could not copy. Please try again.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Share link copied');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const downloadPgn = () => {
    const blob = new Blob([cleanedPgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game'}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {/* Title */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">
              <Link2 className="h-3 w-3" /> Public replay
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-bold tracking-tight text-ink">{title}</h1>
              <button
                onClick={togglePlay}
                disabled={totalPlies === 0}
                aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-[8px] px-4 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                  isPlaying ? 'bg-ink text-paper hover:bg-ink-soft' : 'border border-line-strong bg-paper text-ink hover:bg-surface-2'
                }`}
              >
                {isPlaying ? (<><Pause className="h-4 w-4 fill-current" /> Pause</>) : (<><Play className="h-4 w-4 fill-current" /> Play</>)}
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              Shared on {formatSharedDate(createdAt)}
            </p>
          </div>
          <button onClick={copyLink} className="btn-secondary btn-md w-fit">
            <Link2 className="h-3.5 w-3.5" /> Copy link
          </button>
        </div>

        {/* Replay workspace — board + move sheet share one height; PGN sits below the board */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          {/* Board column */}
          <div className="flex flex-col gap-5">
            <div className="card flex h-[clamp(440px,calc(100vh-160px),720px)] min-h-0 flex-col overflow-hidden p-0">
              <div className="shrink-0 space-y-2.5 border-b border-line px-4 py-3 sm:px-5">
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
                <p className="min-h-[18px] text-[12px] text-muted gp-nums">
                  {currentPlyIndex === 0 ? 'Start position' : `Ply ${currentPlyIndex} of ${totalPlies}`}
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
              </div>
              <div className="flex min-h-0 flex-1 items-center bg-surface px-2 py-3 sm:px-3">
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

            <div className="card space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">PGN</h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#bbf7d0] bg-positive-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-positive">
                    Validated
                  </span>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button onClick={copyPgn} className="btn-secondary btn-sm flex-1 sm:flex-none">
                    <Copy className="h-3.5 w-3.5" /> Copy PGN
                  </button>
                  <button onClick={downloadPgn} className="btn-primary btn-sm flex-1 sm:flex-none">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>
              </div>
              <pre className="max-h-40 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-[10px] border border-line bg-surface px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink/85">
                {cleanedPgn}
              </pre>
            </div>
          </div>

          {/* Move sheet — matched height with visual replay card */}
          <div className="h-[clamp(440px,calc(100vh-160px),720px)] min-h-0 lg:sticky lg:top-20">
            <MoveList turns={turns} currentPlyIndex={currentPlyIndex} onSelectPly={handleSelectPly} readOnly />
          </div>
        </div>

        {/* Conversion CTA */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[16px] border border-line bg-surface px-6 py-6 text-center sm:flex-row sm:text-left">
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
