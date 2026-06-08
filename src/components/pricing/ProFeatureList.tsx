import { Check, Plus } from "lucide-react";
import { PRO_CORE_FEATURES, PRO_PREMIUM_FEATURES } from "./sharedPricing";

export function ProFeatureList({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const rowGap = compact ? "space-y-2" : "space-y-3";
  const dividerMy = compact ? "my-3" : "my-5";
  const textSize = compact ? "text-[12px]" : "text-[13px]";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={className}>
      <ul className={rowGap}>
        {PRO_CORE_FEATURES.map((f) => (
          <li key={f} className={`flex items-start gap-2.5 ${textSize} leading-snug text-muted`}>
            <Check className={`mt-0.5 ${iconSize} shrink-0 text-muted-2`} strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>
      <div className={`relative ${dividerMy} flex items-center`}>
        <div className="h-px flex-1 bg-line" />
        <span className="mx-2.5 text-muted-2">
          <Plus className="h-3 w-3" />
        </span>
        <div className="h-px flex-1 bg-line" />
      </div>
      <ul className={rowGap}>
        {PRO_PREMIUM_FEATURES.map((f) => (
          <li key={f} className={`flex items-start gap-2.5 ${textSize} leading-snug text-ink-soft`}>
            <Check className={`mt-0.5 ${iconSize} shrink-0 text-sky-600 dark:text-sky-400`} strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
