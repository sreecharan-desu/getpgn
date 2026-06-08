import React from 'react';
import {
  Sparkles,
  History,
  Share2,
  ShieldCheck,
  Infinity as InfinityIcon,
  Lock,
  Check,
  Download,
  PenLine,
} from 'lucide-react';
import { QueenMark } from '@/components/ui/Logo';

export const FREE_SCAN_LIMIT = 2;

const PRO_FEATURES = [
  { icon: InfinityIcon, label: 'Unlimited scoresheet scans' },
  { icon: History, label: 'Cloud library with board previews' },
  { icon: Share2, label: 'Shareable interactive replays' },
  { icon: Download, label: 'PGN export & download anytime' },
  { icon: PenLine, label: 'Inline move editing & repair' },
  { icon: ShieldCheck, label: 'Priority validation engine' },
  { icon: Sparkles, label: '5 board color themes' },
] as const;

const FREE_VS_PRO = [
  { feature: 'Scoresheet scans', free: '2 total', pro: 'Unlimited' },
  { feature: 'Move validation', free: true, pro: true },
  { feature: 'PGN export (session)', free: true, pro: true },
  { feature: 'Saved game library', free: false, pro: true },
  { feature: 'Board color themes', free: false, pro: true },
  { feature: 'Shareable replay links', free: false, pro: true },
  { feature: 'Board preview thumbnails', free: false, pro: true },
] as const;

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-positive">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Included
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-muted-2">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Pro only
      </span>
    );
  }
  return <span className="text-[12px] font-medium text-ink">{value}</span>;
}

interface ScanUsageMeterProps {
  used: number;
  limit?: number;
  onUpgrade?: () => void;
  compact?: boolean;
  className?: string;
}

/** Visual scan quota — makes free-tier limits obvious at a glance. */
export function ScanUsageMeter({
  used,
  limit = FREE_SCAN_LIMIT,
  onUpgrade,
  compact = false,
  className = '',
}: ScanUsageMeterProps) {
  const remaining = Math.max(0, limit - used);
  const exhausted = used >= limit;
  const pct = Math.min(100, (used / limit) * 100);

  return (
    <div
      className={`rounded-2xl border border-line-strong bg-paper shadow-[var(--shadow-soft)] ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
            Free plan
          </p>
          <p className="mt-1 text-[15px] font-bold text-ink">
            {exhausted ? 'No scans left' : `${remaining} scan${remaining === 1 ? '' : 's'} remaining`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold gp-nums ${
            exhausted
              ? 'bg-danger-bg text-danger border border-[#fbcfe3]'
              : used === 0
                ? 'bg-surface-2 text-muted border border-line'
                : 'bg-warn-bg text-warn border border-line-strong'
          }`}
        >
          {used}/{limit}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            exhausted ? 'bg-danger' : pct >= 50 ? 'bg-warn' : 'bg-ink'
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${used} of ${limit} free scans used`}
        />
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {exhausted
          ? 'Upgrade to Pro for unlimited digitizing and a permanent game library.'
          : used === 0
            ? 'Try digitizing up to 2 scoresheets — no card required.'
            : 'Export PGN from each session. Upgrade to save games forever.'}
      </p>

      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className={`mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl bg-ink font-bold text-paper transition-all hover:bg-ink-soft active:scale-[0.98] cursor-pointer ${
            compact ? 'py-2.5 text-[12px]' : 'py-3 text-[13px]'
          }`}
        >
          <QueenMark className="h-3.5 w-3.5" />
          {exhausted ? 'Upgrade to continue' : 'View Pro plans'}
        </button>
      )}
    </div>
  );
}

interface FreeVsProTableProps {
  onUpgrade?: () => void;
  className?: string;
  compact?: boolean;
}

export function FreeVsProTable({ onUpgrade, className = '', compact = false }: FreeVsProTableProps) {
  return (
    <div className={`rounded-2xl border border-line bg-surface overflow-hidden ${className}`}>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h3 className="text-[13px] font-bold text-ink">Free vs Pro</h3>
        {!compact && (
          <p className="mt-0.5 text-[11px] text-muted">See what unlocks with an upgrade.</p>
        )}
      </div>
      <div className="divide-y divide-line">
        <div className="grid grid-cols-[1fr_88px_88px] gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-2 sm:px-5">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center">Pro</span>
        </div>
        {FREE_VS_PRO.map((row) => (
          <div
            key={row.feature}
            className="grid grid-cols-[1fr_88px_88px] gap-2 px-4 py-2.5 items-center sm:px-5 hover:bg-surface-2/50 transition-colors"
          >
            <span className="text-[12px] text-ink-soft pr-2">{row.feature}</span>
            <div className="flex justify-center">
              <CellValue value={row.free} />
            </div>
            <div className="flex justify-center">
              <CellValue value={row.pro} />
            </div>
          </div>
        ))}
      </div>
      {onUpgrade && (
        <div className="border-t border-line p-4 sm:px-5">
          <button
            type="button"
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-xl border border-line-strong bg-paper text-[12px] font-semibold text-ink hover:border-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Compare plans & upgrade
          </button>
        </div>
      )}
    </div>
  );
}

export function ProValueProps({ className = '' }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 ${className}`}>
      {PRO_FEATURES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2.5 text-[13px] text-ink">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-paper">
            <Icon className="h-3 w-3" strokeWidth={2} />
          </span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
