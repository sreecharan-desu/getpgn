"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChessBoard, BoardThemePicker, useBoardTheme } from '@/components/ChessBoard';
import { MoveList, Turn } from '@/components/MoveList';
import { ExportPanel } from '@/components/ExportPanel';
import { MobileShareBar } from '@/components/MobileShareBar';
import { BoardPlayerRail } from '@/components/dashboard/BoardPlayerRail';
import { ReplayControls } from '@/components/ReplayControls';
import { Logo } from '@/components/ui/Logo';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { useChessPlySounds } from '@/hooks/useChessPlySounds';
import { useReplayPlayback } from '@/hooks/useReplayPlayback';
import { Link2, ArrowUpRight, ArrowLeftRight, Check } from 'lucide-react';
import { SiLichess, SiChessdotcom } from 'react-icons/si';
import { applyThemePreference, getStoredThemePreference } from '@/lib/theme';
import {
  START_FEN,
  getBoardFenForPly,
  getLastMoveForPly,
  getCheckPlyForDisplay,
} from '@/lib/board-position';

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

        if (value === '?') {
          seenHeader = true;
          continue;
        }
        if (tag === 'Date') {
          if (realDate) header.push(`[Date "${realDate}"]`);
          else if (value !== '????.??.??') header.push(trimmed);
          seenHeader = true;
          continue;
        }
        header.push(trimmed);
        seenHeader = true;
      }
      continue;
    }
    if (seenHeader) headerDone = true;
    movetext.push(line);
  }

  const headerBlock = header.join('\n');
  const moves = movetext.join(' ').replace(/\s+/g, ' ').trim();
  if (!headerBlock) return moves;
  return moves ? `${headerBlock}\n\n${moves}` : headerBlock;
}

const SHARE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatSharedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${SHARE_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function normalizePlayerLabel(
  value: string | undefined | null,
  fallback: 'Player 1' | 'Player 2',
) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'White' || trimmed === 'Black') return fallback;
  return trimmed;
}

interface ShareClientProps {
  title: string;
  whitePlayer: string;
  blackPlayer: string;
  pgn: string;
  movesJson: string;
  createdAt: string;
}

export default function ShareClient({
  title,
  whitePlayer,
  blackPlayer,
  pgn,
  movesJson,
  createdAt,
}: ShareClientProps) {
  const turns: Turn[] = JSON.parse(movesJson);
  const cleanedPgn = cleanPgn(pgn, createdAt);
  const downloadFileName = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game'}.pgn`;
  const [currentPlyIndex, setCurrentPlyIndex] = useState<number>(0);
  useChessPlySounds(turns, currentPlyIndex, turns.length > 0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useBoardTheme(true);

  const displayWhite = useMemo(
    () => normalizePlayerLabel(whitePlayer, 'Player 1'),
    [whitePlayer],
  );
  const displayBlack = useMemo(
    () => normalizePlayerLabel(blackPlayer, 'Player 2'),
    [blackPlayer],
  );
  const boardTopPlayer =
    boardOrientation === 'white' ? displayBlack : displayWhite;
  const boardBottomPlayer =
    boardOrientation === 'white' ? displayWhite : displayBlack;

  const totalReplayPlies = useMemo(
    () =>
      turns.reduce(
        (count, turn) =>
          count + (turn.white?.san ? 1 : 0) + (turn.black?.san ? 1 : 0),
        0,
      ),
    [turns],
  );

  const replayPlayback = useReplayPlayback({
    currentPlyIndex,
    totalPlies: totalReplayPlies,
    onSelectPly: setCurrentPlyIndex,
  });

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
      const checkedColor = player === 'white' ? 'b' : 'w';
      const kingSq = findKingSquare(getBoardFen(), checkedColor);
      if (kingSq) {
        return {
          square: kingSq,
          type: isCheckmate ? ('checkmate' as const) : ('check' as const),
        };
      }
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
        : `Ply ${currentPlyIndex} of ${totalReplayPlies || turns.length * 2}`;
    return { sideToMove, checkInfo, positionLabel };
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink selection:bg-ink selection:text-paper">
      <header className="sticky top-0 z-40 shrink-0 border-b border-line bg-paper/85 px-5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
          <Link href="/" className="group/logo inline-flex rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2">
            <Logo wordmarkSize="md" />
          </Link>
          <Link href="/" className="btn-primary btn-sm">
            Create your own <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 py-5 md:px-6 md:py-8 lg:overflow-visible">
        <div className="flex flex-col gap-3 lg:gap-4">
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

          <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.98fr)] lg:items-stretch lg:gap-5">
            {/* Board column */}
            <div className="order-1 flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-hidden">
              <div className="card flex w-full flex-col overflow-hidden p-0 lg:self-start">
                <div className="shrink-0 space-y-2.5 border-b border-line px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium leading-none text-muted-2">
                        Visual replay
                      </p>
                      <h3
                        className="mt-1 min-w-0 truncate text-[15px] font-semibold leading-snug text-ink sm:text-[16px]"
                        title={title}
                      >
                        {title}
                      </h3>
                      <p className="mt-1 text-[11px] text-muted">
                        Shared on {formatSharedDate(createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')
                      }
                      className="btn-secondary btn-sm shrink-0 px-2.5 sm:px-3"
                      title="Flip board perspective"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Flip board</span>
                    </button>
                  </div>
                  {(() => {
                    const { sideToMove, checkInfo, positionLabel } = getBoardStatus();
                    return (
                      <>
                        <p className="min-h-[1.625rem] text-[12px] leading-snug text-muted">
                          <span className="gp-nums">{positionLabel}</span>
                          <span aria-hidden="true" className="text-muted-2">
                            {' '}
                            ·{' '}
                          </span>
                          <span>{sideToMove} to move</span>
                          <span
                            className={`ml-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold align-middle ${
                              checkInfo
                                ? checkInfo.type === 'checkmate'
                                  ? 'border-[#fbcfe3] bg-danger-bg text-danger'
                                  : 'border-amber-200 bg-warn-bg text-warn'
                                : 'pointer-events-none border-transparent opacity-0'
                            }`}
                            aria-hidden={!checkInfo}
                          >
                            {checkInfo?.type === 'checkmate' ? 'Checkmate' : 'Check'}
                          </span>
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

                <div className="flex flex-col bg-surface px-3 py-3 sm:px-4 sm:py-4">
                  <div className="mx-auto flex w-full max-w-[560px] flex-col">
                    <BoardPlayerRail name={boardTopPlayer} position="top" />
                    <div className="gp-board-fit-host gp-board-fit-host--stacked">
                      <ChessBoard
                        fen={getBoardFen()}
                        orientation={boardOrientation}
                        lastMove={getLastMove()}
                        checkSquare={getCheckHighlight()?.square}
                        checkType={getCheckHighlight()?.type}
                        boardTheme={boardTheme}
                        showColorPicker={false}
                        maxWidth="100%"
                        className="mx-auto"
                      />
                    </div>
                    <BoardPlayerRail name={boardBottomPlayer} position="bottom" />
                    {turns.length > 0 ? (
                      <div className="lg:hidden">
                        <ReplayControls
                          {...replayPlayback}
                          currentPlyIndex={currentPlyIndex}
                          totalPlies={totalReplayPlies}
                          variant="overlay"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="hidden min-h-[9.5rem] shrink-0 overflow-hidden lg:block lg:h-[9.5rem]">
                <ExportPanel
                  section="pgn"
                  pgn={cleanedPgn}
                  gameIsValid
                  isPaid
                  gameId={null}
                  fillHeight
                  compact
                />
              </div>
            </div>

            {/* Move sheet */}
            <div className="order-2 flex min-w-0 flex-col gap-2 lg:min-h-0 lg:overflow-hidden">
              <div className="flex h-[min(420px,50vh)] min-h-[280px] flex-col overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1 lg:max-h-none">
                <MoveList
                  turns={turns}
                  currentPlyIndex={currentPlyIndex}
                  onSelectPly={setCurrentPlyIndex}
                  readOnly
                  playback={replayPlayback}
                  playbackBarClassName="hidden lg:block"
                />
              </div>

              <div className="hidden shrink-0 flex-col gap-2 lg:flex">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                  Analyze elsewhere
                </span>
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://lichess.org/analysis/pgn/${encodeURIComponent(cleanedPgn)}`,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-paper py-2.5 text-[13px] font-semibold text-muted transition-all hover:border-muted-2 hover:bg-surface-2 hover:text-ink"
                >
                  <SiLichess className="h-4 w-4" aria-hidden="true" />
                  Open in Lichess
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://www.chess.com/analysis?pgn=${encodeURIComponent(cleanedPgn)}`,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-paper py-2.5 text-[13px] font-semibold text-muted transition-all hover:border-[var(--color-positive)] hover:bg-surface-2 hover:text-positive"
                >
                  <SiChessdotcom className="h-4 w-4 text-positive" aria-hidden="true" />
                  Open in Chess.com
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[16px] border border-line bg-surface px-6 py-6 text-center sm:mt-8 sm:flex-row sm:text-left">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Digitize your own scoresheets</h3>
            <p className="mt-0.5 text-[13px] text-muted">
              Turn a photo or PGN into a validated, shareable game in seconds.
            </p>
          </div>
          <Link href="/" className="btn-primary btn-md shrink-0">
            Try GetPGN free <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <footer className="mt-8 shrink-0 border-t border-line py-6 text-center text-[12px] text-muted-2 lg:hidden">
          <p>© {new Date().getFullYear()} GetPGN — Chess scoresheet digitizer</p>
          <p className="mt-2 text-muted">
            <Link href="/privacy" className="legal-link">Privacy</Link>
            {' · '}
            <Link href="/terms" className="legal-link">Terms</Link>
            {' · '}
            <Link href="/refund" className="legal-link">Refunds</Link>
          </p>
        </footer>
      </main>

      <footer className="mt-auto hidden shrink-0 border-t border-line bg-paper px-5 py-6 text-center text-[12px] text-muted-2 lg:block">
        <p>© {new Date().getFullYear()} GetPGN — Chess scoresheet digitizer</p>
        <p className="mt-2 text-muted">
          <Link href="/privacy" className="legal-link">Privacy</Link>
            {' · '}
            <Link href="/terms" className="legal-link">Terms</Link>
            {' · '}
            <Link href="/refund" className="legal-link">Refunds</Link>
        </p>
      </footer>
    </div>
  );
}
