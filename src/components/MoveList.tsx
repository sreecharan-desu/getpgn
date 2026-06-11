import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  Info,
  Pencil,
  Trash2,
  Plus,
  Lightbulb,
  ArrowLeftToLine,
  ArrowRightToLine,
} from 'lucide-react';
import { ReplayControls } from '@/components/ReplayControls';
import { useReplayPlayback, type ReplayPlaybackControls } from '@/hooks/useReplayPlayback';

export interface MoveState {
  original: string;
  status: 'valid' | 'ambiguous' | 'illegal' | 'missing';
  san: string | null;
  candidates: string[];
  suggestions: string[];
  fen: string | null;
  uci: string | null;
}

export interface Turn {
  moveNumber: number;
  white: MoveState;
  black: MoveState;
}

export interface Ply {
  index: number;
  moveNumber: number;
  player: 'white' | 'black';
  original: string;
  san: string | null;
  status: 'valid' | 'ambiguous' | 'illegal' | 'missing';
  candidates: string[];
  suggestions: string[];
  fen: string | null;
  uci: string | null;
}

type Status = 'valid' | 'ambiguous' | 'illegal' | 'missing';

interface MoveListProps {
  turns: Turn[];
  currentPlyIndex: number;
  onSelectPly: (plyIndex: number) => void;
  onUpdateMove?: (moveNumber: number, player: 'white' | 'black', newNotation: string) => void;
  onAddTurn?: () => void;
  onRemoveTurn?: (moveNumber: number) => void;
  onInsertPly?: (plyIndex: number, position: 'before' | 'after') => void;
  onDeletePly?: (plyIndex: number) => void;
  onLoadText?: (text: string) => void;
  pendingEditPly?: number | null;
  onConsumePendingEdit?: () => void;
  readOnly?: boolean;
  /** Public share page: match dashboard playback bar at the top. */
  shareReplay?: boolean;
  /** Optional external playback state (e.g. board overlay on mobile). */
  playback?: ReplayPlaybackControls;
  /** Extra classes on the desktop playback bar (e.g. hide on mobile). */
  playbackBarClassName?: string;
}

const moveColor = (status: Status) =>
  status === 'valid' ? 'text-ink' : status === 'missing' ? 'text-muted-2' : 'text-warn';

const turnsToText = (turns: Turn[]) =>
  turns
    .map((t) => `${t.white.original ?? ''} ${t.black.original ?? ''}`.trim())
    .join('\n')
    .trim();

interface MenuState { plyIndex: number; x: number; y: number; }
interface TipState { top: number; left?: number; right?: number; side: 'left' | 'right'; }

export const MoveList: React.FC<MoveListProps> = ({
  turns,
  currentPlyIndex,
  onSelectPly,
  onUpdateMove,
  onAddTurn,
  onInsertPly,
  onDeletePly,
  onLoadText,
  pendingEditPly,
  onConsumePendingEdit,
  readOnly = false,
  shareReplay = false,
  playback: externalPlayback,
  playbackBarClassName = '',
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'text'>('list');
  const [textDraft, setTextDraft] = useState('');
  const [editing, setEditing] = useState<number | null>(null); // ply index (1-based)
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plies: Ply[] = [];
  let plyIdx = 1;
  turns.forEach((turn) => {
    plies.push({ index: plyIdx++, moveNumber: turn.moveNumber, player: 'white', ...turn.white });
    plies.push({ index: plyIdx++, moveNumber: turn.moveNumber, player: 'black', ...turn.black });
  });

  const totalPlies = plies.length;
  const flaggedCount = plies.filter((p) => p.status === 'ambiguous' || p.status === 'illegal').length;
  const editable = !readOnly && !!onUpdateMove;
  const controlsPlacement: 'top' | 'share' =
    readOnly && !shareReplay ? 'share' : 'top';

  const internalPlayback = useReplayPlayback({
    currentPlyIndex,
    totalPlies,
    onSelectPly,
  });
  const playback = externalPlayback ?? internalPlayback;
  const isPlaying = playback.isPlaying;

  useEffect(() => {
    if (!isPlaying || currentPlyIndex === 0) return;
    const container = listScrollRef.current;
    if (!container) return;
    const row = container.querySelector(
      `[data-ply-index="${currentPlyIndex}"]`,
    ) as HTMLElement | null;
    if (!row) return;

    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();

    if (rowRect.top < containerRect.top) {
      container.scrollTo({
        top: container.scrollTop + (rowRect.top - containerRect.top),
        behavior: 'smooth',
      });
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollTo({
        top: container.scrollTop + (rowRect.bottom - containerRect.bottom),
        behavior: 'smooth',
      });
    }
  }, [currentPlyIndex, isPlaying]);

  // Sync the text editor whenever we switch into Text mode.
  useEffect(() => {
    if (viewMode === 'text') setTextDraft(turnsToText(turns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  useEffect(() => {
    if (editing) {
      const t = setTimeout(() => inputRef.current?.select(), 30);
      return () => clearTimeout(t);
    }
  }, [editing]);

  // Open an editor requested by the parent (e.g. right after inserting a ply).
  useEffect(() => {
    if (pendingEditPly && pendingEditPly >= 1) {
      const ply = plies[pendingEditPly - 1];
      setViewMode('list');
      setEditing(pendingEditPly);
      setDraft(ply ? ply.original : '');
      onConsumePendingEdit?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEditPly]);

  // Dismiss the context menu on any outside interaction.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const selectPly = useCallback(
    (plyIndex: number) => {
      playback.stopPlaying();
      onSelectPly(plyIndex);
    },
    [onSelectPly, playback],
  );

  const startEdit = useCallback((ply: Ply) => {
    if (!editable) return;
    setMenu(null);
    setTip(null);
    setEditing(ply.index);
    setDraft(ply.original);
  }, [editable]);

  const cancelEdit = () => setEditing(null);

  const apply = useCallback(
    (ply: Ply, value: string) => {
      if (onUpdateMove && value.trim()) onUpdateMove(ply.moveNumber, ply.player, value.trim());
      setEditing(null);
    },
    [onUpdateMove],
  );

  const openMenu = (ply: Ply, x: number, y: number) => {
    if (!editable) return;
    setTip(null);
    const sugg = Array.from(new Set([...ply.candidates, ...ply.suggestions]));
    const rows = sugg.length + 1 /* edit */ + (onInsertPly ? 2 : 0) + (onDeletePly ? 1 : 0);
    const MW = 236;
    const MH = rows * 38 + (sugg.length > 0 ? 13 : 0) + 16;
    setMenu({
      plyIndex: ply.index,
      x: Math.max(8, Math.min(x, window.innerWidth - MW - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - MH - 8)),
    });
  };

  const startLongPress = (ply: Ply, e: React.TouchEvent) => {
    if (!editable) return;
    const t = e.touches[0];
    longPress.current = setTimeout(() => openMenu(ply, t.clientX, t.clientY), 450);
  };
  const clearLongPress = () => { if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; } };

  const menuPly = menu ? plies[menu.plyIndex - 1] : null;
  const menuSugg = menuPly ? Array.from(new Set([...menuPly.candidates, ...menuPly.suggestions])) : [];

  const showTip = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const top = r.top + r.height / 2;
    const TIP_W = 230;
    if (r.right + 12 + TIP_W > window.innerWidth) {
      setTip({ top, right: window.innerWidth - (r.left - 12), side: 'left' });
    } else {
      setTip({ top, left: r.right + 12, side: 'right' });
    }
  };

  const renderCell = (ply: Ply) => {
    const isSelected = currentPlyIndex === ply.index;
    const isEditing = editing === ply.index;
    const hasHints = ply.candidates.length > 0 || ply.suggestions.length > 0;

    return (
      <div
        data-ply-index={ply.index}
        className="relative border-r border-line last:border-r-0"
        onContextMenu={(e) => { if (editable) { e.preventDefault(); openMenu(ply, e.clientX, e.clientY); } }}
        onTouchStart={(e) => startLongPress(ply, e)}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
      >
        {isEditing ? (
          <div className="flex h-full min-h-[52px] items-center justify-center px-2 py-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => apply(ply, draft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') apply(ply, draft);
                else if (e.key === 'Escape') cancelEdit();
              }}
              placeholder="move"
              className="w-[96px] rounded-md border-2 border-emerald-500 bg-paper px-2 py-1 text-center font-mono text-[15px] font-medium text-ink outline-none placeholder:text-muted-2"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => selectPly(ply.index)}
            onDoubleClick={() => startEdit(ply)}
            onMouseEnter={(e) => { if (editable && hasHints) showTip(e); }}
            onMouseLeave={() => setTip(null)}
            title={hasHints ? undefined : editable ? 'Double or right-click to edit' : ply.san && ply.san !== ply.original ? `SAN: ${ply.san}` : undefined}
            className={[
              'flex h-full min-h-[44px] w-full min-w-0 cursor-pointer items-center justify-center gap-1 px-1.5 py-2 transition-colors sm:min-h-[52px] sm:gap-1.5 sm:px-2',
              isSelected
                ? 'bg-surface-2 ring-2 ring-inset ring-emerald-500'
                : 'hover:bg-surface',
            ].join(' ')}
          >
            <span className={['truncate font-mono text-[13px] font-medium sm:text-[15px]', moveColor(ply.status as Status)].join(' ')}>
              {ply.original || <span className="text-muted-2">—</span>}
            </span>
            {hasHints && <Lightbulb className="h-3.5 w-3.5 shrink-0 text-warn" />}
          </button>
        )}

        {/* Inline suggestions while editing a flagged move (anchored, not a blocking modal) */}
        {isEditing && hasHints && (
          <div className="absolute left-1/2 top-full z-50 mt-1 w-max max-w-[240px] -translate-x-1/2 rounded-[10px] border border-line bg-paper p-2 shadow-[var(--shadow-pop)] gp-scale-in">
            {ply.candidates.length > 0 && (
              <>
                <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-warn">Disambiguate</div>
                <div className="mb-1 flex flex-wrap justify-center gap-1">
                  {ply.candidates.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); apply(ply, c); }}
                      className="cursor-pointer rounded-[7px] border border-line-strong bg-paper px-2.5 py-1 font-mono text-[13px] font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            {ply.suggestions.length > 0 && (
              <>
                <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Did you mean</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {ply.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); apply(ply, s); }}
                      className="cursor-pointer rounded-[7px] border border-line-strong bg-paper px-2.5 py-1 font-mono text-[13px] font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const playbackBar = (placement: 'top' | 'share') => (
    <ReplayControls
      {...playback}
      currentPlyIndex={currentPlyIndex}
      totalPlies={totalPlies}
      variant="panel"
      showPlay={placement === 'top'}
      className={`${placement === 'top' ? 'border-b' : 'border-t'} ${playbackBarClassName}`}
    />
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-paper text-ink">
      {/* Header */}
      <div className="space-y-2 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="shrink-0 text-[15px] font-semibold text-ink">Move sheet</h3>
          <div className="inline-flex shrink-0 rounded-lg border border-line-strong bg-paper p-0.5">
            {(['list', 'text'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setEditing(null); setViewMode(m); }}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition-all sm:px-3 sm:text-[13px] ${
                  viewMode === m ? 'bg-ink text-paper shadow-[var(--shadow-soft)]' : 'text-muted hover:text-ink'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-[26px] flex-wrap items-center gap-1.5">
          <span
            className={`chip gp-nums whitespace-nowrap text-[11px] ${
              turns.length === 0 ? "invisible" : ""
            }`}
          >
            {turns.length || 0} turns
          </span>
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn ${
              flaggedCount === 0 ? "invisible" : ""
            }`}
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            {flaggedCount || 0} to fix
          </span>
        </div>
      </div>

      {/* Playback Controls (dashboard: pinned to the top, above the move table) */}
      {controlsPlacement === 'top' && playbackBar('top')}

      {/* Body */}
      <div ref={listScrollRef} className="flex-1 overflow-y-auto overscroll-y-contain p-3">
        {turns.length === 0 && viewMode === 'list' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface">
              <AlertCircle className="h-5 w-5 text-muted-2" />
            </div>
            <p className="text-[13px] text-muted">No moves yet.</p>
            {editable && onAddTurn && (
              <button onClick={onAddTurn} className="btn-secondary btn-sm">
                <Plus className="h-3.5 w-3.5" /> Add first turn
              </button>
            )}
          </div>
        ) : viewMode === 'text' ? (
          /* TEXT VIEW — editable move text with a line-number gutter */
          <div className="flex flex-col gap-2">
            <div className="flex overflow-hidden rounded-[10px] border border-line-strong bg-paper">
              <div className="select-none border-r border-line bg-surface px-3 py-3 text-right font-mono text-[13px] leading-[1.9] text-muted-2">
                {(textDraft.split('\n').length ? textDraft.split('\n') : ['']).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onBlur={() => onLoadText?.(textDraft)}
                readOnly={!editable}
                spellCheck={false}
                wrap="off"
                className="flex-1 resize-none whitespace-pre bg-paper px-3 py-3 font-mono text-[13px] leading-[1.9] text-ink outline-none"
                style={{ minHeight: '320px' }}
                placeholder={'e4 d5\nNf3 Nc6\nBc4 Nf6 ...'}
              />
            </div>
            {editable && (
              <p className="px-1 text-[12px] text-muted-2">One turn per line as “white black”. Changes apply when you click away.</p>
            )}
          </div>
        ) : (
          /* LIST VIEW — bordered table */
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-[12px] border border-line [-webkit-overflow-scrolling:touch]">
              <div className="min-w-[248px]">
                {turns.map((turn, tIdx) => (
                  <div
                    key={turn.moveNumber}
                    className="grid grid-cols-[minmax(2.75rem,3rem)_minmax(0,1fr)_minmax(0,1fr)] border-b border-line last:border-b-0"
                  >
                    <div className="grid shrink-0 place-items-center border-r border-line bg-surface/60 px-1 font-mono text-[12px] text-muted-2 gp-nums sm:text-[13px]">
                      {turn.moveNumber}.
                    </div>
                    {renderCell(plies[tIdx * 2])}
                    {renderCell(plies[tIdx * 2 + 1])}
                  </div>
                ))}
              </div>
            </div>

            {editable && (
              <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[12px] text-muted">
                <Info className="h-3.5 w-3.5 shrink-0 text-muted-2" />
                <span>Double or right-click (desktop), or hold (mobile) to edit</span>
              </div>
            )}

            {editable && onAddTurn && (
              <div className="flex justify-center">
                <button onClick={onAddTurn} className="btn-ghost btn-sm">
                  <Plus className="h-3.5 w-3.5" /> Add turn
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playback Controls (share page: slim nav at the bottom, no Play/Pause) */}
      {readOnly && !shareReplay && playbackBar('share')}

      {/* Hover tooltip for flagged moves */}
      {tip && (
        <div
          className="pointer-events-none fixed z-[55] -translate-y-1/2"
          style={{ top: tip.top, left: tip.left, right: tip.right }}
        >
          <div className="relative whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-[12px] font-medium text-paper shadow-[var(--shadow-pop)]">
            Right-click to see suggested moves
            {tip.side === 'right' ? (
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-r-[6px] border-y-transparent border-r-ink" />
            ) : (
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-y-[5px] border-l-[6px] border-y-transparent border-l-ink" />
            )}
          </div>
        </div>
      )}

      {/* Right-click / long-press context menu */}
      {menu && menuPly && (
        <div
          className="fixed z-[60] w-[236px] overflow-hidden rounded-[12px] border border-line bg-paper p-1.5 shadow-[var(--shadow-modal)] gp-scale-in"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          {menuSugg.length > 0 && (
            <>
              {menuSugg.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); apply(menuPly, s); setMenu(null); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left font-mono text-[13px] font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  <Lightbulb className="h-4 w-4 shrink-0 text-muted" /> {s}
                </button>
              ))}
              <div className="my-1 h-px bg-line" />
            </>
          )}
          <button
            onClick={() => startEdit(menuPly)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
          >
            <Pencil className="h-4 w-4 shrink-0 text-muted" /> Edit
          </button>
          {onInsertPly && (
            <>
              <button
                onClick={() => { onInsertPly(menuPly.index, 'before'); setMenu(null); }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
              >
                <ArrowLeftToLine className="h-4 w-4 shrink-0 text-muted" /> Insert before this move
              </button>
              <button
                onClick={() => { onInsertPly(menuPly.index, 'after'); setMenu(null); }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
              >
                <ArrowRightToLine className="h-4 w-4 shrink-0 text-muted" /> Insert after this move
              </button>
            </>
          )}
          {onDeletePly && (
            <button
              onClick={() => { onDeletePly(menuPly.index); setMenu(null); }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-bg"
            >
              <Trash2 className="h-4 w-4 shrink-0" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
