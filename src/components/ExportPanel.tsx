import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, FileText, Share2, Save, ExternalLink, Lock } from 'lucide-react';

interface ExportPanelProps {
  pgn: string;
  gameIsValid: boolean;
  isPaid: boolean;
  gameId: string | null;
  initialSharedSlug?: string | null;
  onSave?: (title: string) => Promise<string | null>;
  onShare?: (gameId: string) => Promise<string | null>;
  /** Which sub-blocks to render. 'all' (default) shows both PGN output and Save & share. */
  section?: 'all' | 'pgn' | 'share';
  /** Stretch PGN card + textarea to fill a flex parent (review workspace). */
  fillHeight?: boolean;
  /** Compact layout for mobile review workspace. */
  compact?: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  pgn,
  gameIsValid,
  isPaid,
  gameId,
  initialSharedSlug = null,
  onSave,
  onShare,
  section = 'all',
  fillHeight = false,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(gameId);
  const [sharedSlug, setSharedSlug] = useState<string | null>(initialSharedSlug);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    setSavedId(gameId);
    setSharedSlug(initialSharedSlug);
    setIsEditingTitle(false);
  }, [gameId, initialSharedSlug]);

  const handleCopy = async () => {
    if (!pgn) return;
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyShareLink = async () => {
    if (!sharedSlug) return;
    const shareUrl = `${window.location.origin}/share/${sharedSlug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  const handleDownload = () => {
    if (!pgn) return;
    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `game_${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startEditingTitle = () => {
    setCustomTitle(`Scanned Game - ${new Date().toLocaleDateString('en-CA')}`);
    setIsEditingTitle(true);
  };

  const handleSave = async () => {
    if (!onSave || !customTitle.trim()) return;
    setSaving(true);
    const id = await onSave(customTitle.trim());
    if (id) {
      setSavedId(id);
      setIsEditingTitle(false);
    }
    setSaving(false);
  };

  const handleShare = async () => {
    if (!onShare || !savedId) return;
    setSharing(true);
    const slug = await onShare(savedId);
    if (slug) setSharedSlug(slug);
    setSharing(false);
  };

  const shareUrl = sharedSlug ? `${window.location.origin}/share/${sharedSlug}` : '';

  const formatPgnMoves = (rawPgn: string): string => {
    if (!rawPgn) return '';
    const lines = rawPgn.split('\n');
    const moveLines = lines.filter(line => !line.trim().startsWith('['));
    let movesText = moveLines.join(' ').trim();
    movesText = movesText.replace(/\s+/g, ' ');
    movesText = movesText.replace(/\s*(\*|1-0|0-1|1\/2-1\/2)\s*$/, '');
    const moveRegex = /(\d+)\.\s+([^\s]+)(?:\s+([^\s]+))?/g;
    const formattedPairs: string[] = [];
    let match;
    while ((match = moveRegex.exec(movesText)) !== null) {
      const num = match[1];
      const white = match[2];
      const black = match[3] || '';
      formattedPairs.push(`${num}. ${white} ${black}`.trim());
    }
    return formattedPairs.join('\n\n');
  };

  const displayPgn = pgn
    ? formatPgnMoves(pgn)
    : 'PGN will be generated after resolving any ambiguous or illegal moves.';

  const showPgn = section !== 'share';
  const showShare = section !== 'pgn';

  return (
    <div
      className={`card text-ink ${compact ? 'p-3.5' : 'p-5'} ${
        fillHeight && section === 'pgn' ? 'flex h-full min-h-0 flex-col' : ''
      }`}
    >
      <div
        className={`flex flex-col gap-4 ${
          fillHeight && section === 'pgn' ? 'flex min-h-0 flex-1 flex-col' : ''
        }`}
      >

        {/* ── PGN output + primary actions ── */}
        {showPgn && (
        <div
          className={`flex min-w-0 flex-col gap-3 ${
            fillHeight && section === 'pgn' ? 'min-h-0 flex-1' : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`flex items-center gap-2 font-semibold text-ink ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
                <FileText className={compact ? 'h-3.5 w-3.5 text-muted-2' : 'h-4 w-4 text-muted-2'} />
                <span>PGN output</span>
              </h3>
              {gameIsValid ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#bbf7d0] bg-positive-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-positive">
                  Validated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-warn-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-warn">
                  Pending
                </span>
              )}
            </div>
            <div className={`flex w-full gap-2 ${compact ? '' : 'sm:w-auto'}`}>
              <button
                onClick={handleCopy}
                disabled={!pgn}
                className={`btn-secondary flex-1 ${compact ? 'btn-sm px-2.5 text-[12px]' : 'btn-sm sm:flex-none'}`}
              >
                {copied ? (<><Check className="h-3 w-3" /> Copied</>) : (<><Copy className="h-3 w-3" /> Copy PGN</>)}
              </button>
              <button
                onClick={handleDownload}
                disabled={!pgn}
                className={`btn-primary flex-1 ${compact ? 'btn-sm px-2.5 text-[12px]' : 'btn-sm sm:flex-none'}`}
              >
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={displayPgn}
            className={`w-full resize-none rounded-[10px] border border-line bg-surface font-mono leading-relaxed text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-ink ${
              compact
                ? 'h-16 p-2.5 text-[11.5px]'
                : fillHeight && section === 'pgn'
                  ? 'min-h-[8rem] flex-1 p-3.5 text-[12.5px]'
                  : 'h-24 p-3.5 text-[12.5px]'
            }`}
          />
        </div>
        )}

        {/* ── Save / share ── */}
        {showShare && (
        <div className={`flex flex-col gap-3 ${section === 'all' ? 'border-t border-line pt-4' : ''}`}>
          {section === 'all' ? (
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Share2 className="h-3 w-3" /> Save &amp; share
            </h4>
          ) : (
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Share2 className="h-4 w-4 text-muted-2" />
              <span>Save &amp; share</span>
            </h3>
          )}

        {!isPaid ? (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-line bg-surface p-3 text-[13px] leading-relaxed text-muted">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
            <div>
              <span className="mb-0.5 block font-semibold text-ink">Available on Pro</span>
              Upgrade to save games to your library and share interactive board replays.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Prominent live link card — shown first so it's immediately visible */}
            {sharedSlug && (
              <div className="space-y-2.5 rounded-[12px] border-2 border-line-strong bg-surface-2 p-3.5 shadow-soft">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink">Shareable link is live</span>
                </div>
                <p className="text-[12px] leading-snug text-muted">Anyone with this link can view the interactive replay.</p>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-[8px] border border-line-strong bg-paper px-3 py-2.5 font-mono text-[12.5px] text-ink outline-none transition-colors focus:border-ink"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleCopyShareLink} className="btn-primary btn-md min-w-[140px] flex-1">
                    {shareCopied ? (<><Check className="h-3.5 w-3.5" /> Link copied</>) : (<><Copy className="h-3.5 w-3.5" /> Copy link</>)}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-md flex-1"
                    title="Open share link in a new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                </div>
              </div>
            )}

            {!savedId ? (
              !isEditingTitle ? (
                <div className="space-y-1.5">
                  <button onClick={startEditingTitle} disabled={saving || !pgn} className="btn-secondary btn-md w-full">
                    <Save className="h-3.5 w-3.5" /> Save game to history
                  </button>
                  {!gameIsValid && pgn && (
                    <p className="text-[12px] leading-snug text-muted">
                      You can save now even with flagged moves — fix them anytime later.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 rounded-[12px] border border-line bg-surface p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">Game title</span>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="input"
                    placeholder="e.g. Round 1 vs Magnus"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving || !customTitle.trim()} aria-busy={saving || undefined} className="btn-primary btn-sm flex-1">
                      {saving ? 'Saving…' : 'Confirm save'}
                    </button>
                    <button onClick={() => setIsEditingTitle(false)} disabled={saving} className="btn-secondary btn-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              !sharedSlug && (
                <button onClick={handleShare} disabled={sharing} aria-busy={sharing || undefined} className="btn-secondary btn-md w-full">
                  <Share2 className="h-3.5 w-3.5" /> {sharing ? 'Generating link…' : 'Generate shareable link'}
                </button>
              )
            )}
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
};
