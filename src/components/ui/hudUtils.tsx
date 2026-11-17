/**
 * Shared HUD state helpers & StatModifier row shared across TacticalActionRibbon and InspectDossier.
 */
import type { StatModifier } from "../../core/types";
import { formatMeasure, formatPhrase, useLocale } from "../../i18n";
import { useGameStore } from "../../store/useGameStore";

export function useIsCinematicHudHidden(hideDuringAim = false): boolean {
  const actionMode = useGameStore((s) => s.actionMode);
  const activeProjectile = useGameStore((s) => s.activeProjectile);
  const isBusy = useGameStore((s) => s.isBusy);
  const activeMovement = useGameStore((s) => s.activeMovement);
  if (activeProjectile !== null || Boolean(isBusy && activeMovement?.isActionCam)) {
    return true;
  }
  if (hideDuringAim && (actionMode === "shoot" || actionMode === "melee")) {
    return true;
  }
  return false;
}

export function StatModifierRow({
  item,
  compact = false,
}: {
  item: StatModifier;
  compact?: boolean;
}) {
  useLocale();
  const isPositive =
    item.kind === "bonus" || (item.kind === "base" && item.value > 0);
  const isPenalty = item.kind === "penalty" || item.value < 0;
  const formattedValue = formatMeasure(item.unit, item.value);

  if (compact) {
    return (
      <div className="flex items-start justify-between gap-2 py-0.5 text-[11px]">
        <div className="min-w-0">
          <div className="font-cinzel font-bold text-amber-100 leading-tight">
            {formatPhrase(item.label)}
          </div>
          {item.detail && (
            <div className="font-literata italic text-[10px] text-amber-200/75 leading-tight">
              {formatPhrase(item.detail)}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 font-cinzel font-black tabular-nums ${
            isPositive
              ? "text-emerald-300"
              : isPenalty
                ? "text-rose-300"
                : "text-amber-200"
          }`}
        >
          {formattedValue}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2.5 py-1 px-2 rounded bg-slate-950/90 border border-amber-500/40 text-[10px]">
      <div className="min-w-0">
        <div className="font-cinzel font-black text-amber-100 leading-tight truncate">
          {formatPhrase(item.label)}
        </div>
        {item.detail && (
          <div className="font-literata italic text-[9px] text-amber-200/80 leading-tight">
            {formatPhrase(item.detail)}
          </div>
        )}
      </div>
      <span
        className={`shrink-0 font-cinzel font-black px-1.5 py-0.2 rounded text-[9px] tabular-nums ${
          item.kind === "base"
            ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
            : isPositive
              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/60"
              : isPenalty
                ? "bg-rose-950/90 text-rose-300 border border-rose-500/60"
                : "bg-black/70 text-amber-300 border border-amber-900/60"
        }`}
      >
        {formattedValue}
      </span>
    </div>
  );
}
