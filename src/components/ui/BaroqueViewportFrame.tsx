/**
 * Subtle Baroque Viewport Corner Filigree Frame (`/src/components/ui/BaroqueViewportFrame.tsx`).
 *
 * Adds delicate gilded 17th-century acanthus corner ornaments strictly in the outermost
 * perimeter margins (`pointer-events-none`, zero center occlusion, zero backdrop-filter)
 * so the tactical battlefield stays 100% readable while feeling framed like a Baroque engraving.
 */

import { useGameStore } from "../../store/useGameStore";
import { getBaroqueChiaroscuroFrameStyle } from "../canvas/baroqueMaterials";
import { useIsCinematicHudHidden } from "./hudUtils";

function CornerFiligree({
  className,
  stroke,
}: {
  className: string;
  stroke: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className={`pointer-events-none absolute w-11 h-11 sm:w-14 sm:h-14 ${className}`}
    >
      {/* Outer gilded hairline corner bracket */}
      <path
        d="M3 46 V8 Q3 3 8 3 H46"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Inner recessed double filigree */}
      <path
        d="M8 34 V11 Q8 8 11 8 H34"
        stroke={stroke}
        strokeWidth="0.85"
        strokeOpacity="0.65"
        strokeLinecap="round"
      />
      {/* Baroque acanthus C-scroll flourish */}
      <path
        d="M11 22 C11 14, 14 11, 22 11 C17 14, 14 17, 11 22 Z"
        fill={stroke}
        fillOpacity="0.32"
        stroke={stroke}
        strokeWidth="0.9"
      />
      {/* Corner boss diamond */}
      <path
        d="M6.5 6.5 L9.5 3.5 L12.5 6.5 L9.5 9.5 Z"
        fill={stroke}
        fillOpacity="0.85"
      />
      {/* Delicate terminal dot accents */}
      <circle cx="51" cy="3" r="1.4" fill={stroke} fillOpacity="0.7" />
      <circle cx="3" cy="51" r="1.4" fill={stroke} fillOpacity="0.7" />
    </svg>
  );
}

export function BaroqueViewportFrame() {
  const scenario = useGameStore((s) => s.scenario);
  const isHiddenInCinematic = useIsCinematicHudHidden(false);

  if (isHiddenInCinematic) return null;

  const style = getBaroqueChiaroscuroFrameStyle(scenario);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden select-none"
      style={{ opacity: style.cornerOpacity }}
    >
      <CornerFiligree className="top-1 left-1" stroke={style.accentHex} />
      <CornerFiligree className="top-1 right-1 -scale-x-100" stroke={style.accentHex} />
      <CornerFiligree className="bottom-1 left-1 -scale-y-100" stroke={style.accentHex} />
      <CornerFiligree className="bottom-1 right-1 -scale-x-100 -scale-y-100" stroke={style.accentHex} />
      {/* Ultra-delicate Baroque engraving hairline edges along outer perimeter */}
      <div
        className="pointer-events-none absolute top-1 left-16 right-16 h-px opacity-45"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${style.accentHex} 22%, transparent 45%, transparent 55%, ${style.accentHex} 78%, transparent 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-1 left-16 right-16 h-px opacity-45"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${style.accentHex} 24%, transparent 46%, transparent 54%, ${style.accentHex} 76%, transparent 100%)`,
        }}
      />
    </div>
  );
}
