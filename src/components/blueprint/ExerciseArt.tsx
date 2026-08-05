import type { ArtKey } from "@/lib/blueprint/data";

/**
 * Lightweight line-art movement illustrations.
 * Pure inline SVG (no network cost), stroked with currentColor and a red
 * accent so they inherit the ASCEND palette everywhere they appear.
 */

const S = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Head({ cx, cy, r = 4 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} />;
}

const DRAWINGS: Record<ArtKey, React.ReactNode> = {
  bench: (
    <>
      <line x1="10" y1="42" x2="54" y2="42" />
      <line x1="16" y1="42" x2="16" y2="54" />
      <line x1="48" y1="42" x2="48" y2="54" />
      <Head cx={18} cy={36} />
      <path d="M22 38h20" />
      <g className="text-brand-red" stroke="currentColor">
        <line x1="14" y1="20" x2="50" y2="20" />
        <path d="M26 20v6M42 20v6" />
        <path d="M26 26 22 38M42 26l4 12" />
      </g>
    </>
  ),
  "incline-press": (
    <>
      <path d="M12 50h30l6-24" />
      <line x1="18" y1="50" x2="18" y2="56" />
      <Head cx={40} cy={26} />
      <path d="M38 30 30 40M42 30l6 6" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M26 14h10M28 12v4M34 12v4" />
        <path d="M31 16 38 26" />
      </g>
    </>
  ),
  fly: (
    <>
      <Head cx={32} cy={16} />
      <path d="M32 20v20M32 40l-6 14M32 40l6 14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M32 26C22 26 14 22 12 16" />
        <path d="M32 26c10 0 18-4 20-10" />
        <circle cx="10" cy="14" r="3" />
        <circle cx="54" cy="14" r="3" />
      </g>
    </>
  ),
  pushup: (
    <>
      <path d="M8 52h22" />
      <line x1="34" y1="34" x2="34" y2="52" />
      <path d="M34 34h18v18" />
      <Head cx={16} cy={34} />
      <path d="M20 36 34 40" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M22 38v10M30 40v8" />
      </g>
    </>
  ),
  "shoulder-press": (
    <>
      <path d="M28 52h10" />
      <line x1="32" y1="34" x2="32" y2="52" />
      <Head cx={32} cy={28} />
      <path d="M28 34h8" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M26 34 20 18M38 34l6-16" />
        <path d="M14 16h12M38 16h12" />
      </g>
    </>
  ),
  lateral: (
    <>
      <Head cx={32} cy={16} />
      <path d="M32 20v20M32 40l-5 14M32 40l5 14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M32 26H12M32 26h20" />
        <path d="M10 22v8M54 22v8" />
      </g>
    </>
  ),
  "rear-delt": (
    <>
      <Head cx={22} cy={22} />
      <path d="M26 24 42 32M42 32l6 18" />
      <path d="M42 32l-6 18" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M30 26 16 40M30 26l14 12" />
        <circle cx="13" cy="43" r="3" />
        <circle cx="47" cy="41" r="3" />
      </g>
    </>
  ),
  curl: (
    <>
      <Head cx={32} cy={14} />
      <path d="M32 18v20M32 38l-5 16M32 38l5 16" />
      <path d="M28 22 24 34M36 22l4 12" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M16 34h32M22 30v8M42 30v8" />
      </g>
    </>
  ),
  hammer: (
    <>
      <Head cx={32} cy={14} />
      <path d="M32 18v20M32 38l-5 16M32 38l5 16" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M24 24v10M40 24v10" />
        <path d="M20 22h8M20 36h8M36 22h8M36 36h8" />
      </g>
    </>
  ),
  pushdown: (
    <>
      <line x1="50" y1="8" x2="50" y2="30" />
      <rect x="44" y="30" width="12" height="18" rx="2" />
      <Head cx={24} cy={18} />
      <path d="M24 22v18M24 40l-4 14M24 40l4 14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M28 26 42 20" />
        <path d="M28 26v10" />
        <path d="M24 36h10" />
      </g>
    </>
  ),
  "overhead-ext": (
    <>
      <Head cx={32} cy={26} />
      <path d="M32 30v18M32 48l-5 8M32 48l5 8" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M28 30 26 16h12l-2 14" />
        <path d="M22 12h20" />
      </g>
    </>
  ),
  pulldown: (
    <>
      <line x1="32" y1="6" x2="32" y2="14" />
      <Head cx={32} cy={30} />
      <path d="M32 34v10M26 52h14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M14 14h36" />
        <path d="M20 14 30 30M44 14 34 30" />
      </g>
    </>
  ),
  row: (
    <>
      <path d="M10 50h20" />
      <Head cx={24} cy={22} />
      <path d="M24 26v18" />
      <path d="M24 44h16" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M28 30h20" />
        <path d="M50 24v14" />
      </g>
    </>
  ),
  "straight-arm": (
    <>
      <line x1="52" y1="6" x2="52" y2="16" />
      <Head cx={26} cy={20} />
      <path d="M26 24v16M26 40l-4 14M26 40l6 14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M28 28 48 18" />
        <path d="M36 16h20" />
      </g>
    </>
  ),
  squat: (
    <>
      <Head cx={32} cy={18} />
      <path d="M32 22v12M32 34l-8 10 2 12M32 34l8 10-2 12" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M14 26h36M20 22v8M44 22v8" />
      </g>
    </>
  ),
  rdl: (
    <>
      <Head cx={20} cy={22} />
      <path d="M24 24 40 30M40 30v22" />
      <path d="M28 26v14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M16 44h28M22 40v8M38 40v8" />
        <path d="M28 40v4" />
      </g>
    </>
  ),
  "leg-press": (
    <>
      <path d="M8 46h22l6-8" />
      <Head cx={14} cy={38} />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M36 38 48 26" />
        <path d="M42 18h14v20H42z" />
      </g>
      <path d="M8 46v8" />
    </>
  ),
  lunge: (
    <>
      <Head cx={30} cy={14} />
      <path d="M30 18v14" />
      <path d="M30 32 18 52M30 32l10 10 2 10" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M24 24v10M38 24v10" />
        <path d="M20 22h8M34 22h8" />
      </g>
    </>
  ),
  "leg-curl": (
    <>
      <path d="M10 40h30" />
      <Head cx={14} cy={34} />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M40 40c10 0 12 -6 10 -14" />
        <circle cx="50" cy="24" r="3" />
      </g>
      <path d="M12 44h26" />
    </>
  ),
  calf: (
    <>
      <Head cx={32} cy={14} />
      <path d="M32 18v20" />
      <path d="M32 38v10" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M26 48h12" />
        <path d="M24 54h16" />
        <path d="M32 48v6" />
      </g>
    </>
  ),
  "knee-raise": (
    <>
      <line x1="14" y1="10" x2="50" y2="10" />
      <path d="M26 12v10M38 12v10" />
      <Head cx={32} cy={26} />
      <path d="M32 30v10" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M32 40 44 42 42 52" />
        <path d="M32 40l10 4" />
      </g>
    </>
  ),
  plank: (
    <>
      <path d="M8 50h48" />
      <Head cx={16} cy={34} />
      <path d="M20 36 46 44" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M18 38v10M46 44v6" />
      </g>
    </>
  ),
  dip: (
    <>
      <path d="M12 22h14M38 22h14" />
      <line x1="16" y1="22" x2="16" y2="54" />
      <line x1="48" y1="22" x2="48" y2="54" />
      <Head cx={32} cy={22} />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M28 24 18 20M36 24l10-4" />
        <path d="M32 26v14l-4 10M32 40l4 10" />
      </g>
    </>
  ),
  pullup: (
    <>
      <line x1="10" y1="12" x2="54" y2="12" />
      <Head cx={32} cy={28} />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M24 12 29 26M40 12l-5 14" />
      </g>
      <path d="M32 32v12M32 44l-4 10M32 44l4 10" />
    </>
  ),
  shrug: (
    <>
      <Head cx={32} cy={14} />
      <path d="M32 18v18M32 36l-5 18M32 36l5 18" />
      <path d="M24 22v14M40 22v14" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M14 36h36M20 32v8M44 32v8" />
      </g>
    </>
  ),
  "face-pull": (
    <>
      <line x1="54" y1="8" x2="54" y2="26" />
      <Head cx={24} cy={22} />
      <path d="M24 26v16M24 42l-4 12M24 42l5 12" />
      <g className="text-brand-red" stroke="currentColor">
        <path d="M30 18 52 18" />
        <path d="M30 26 52 22" />
      </g>
    </>
  ),
};

export function ExerciseArt({
  art,
  className = "size-10",
  strokeWidth = 2,
}: {
  art: ArtKey;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden
      {...S}
    >
      {DRAWINGS[art]}
    </svg>
  );
}

/** Large hero variant used on workout cards and the session header. */
export function WorkoutArt({ art, className = "size-20" }: { art: ArtKey; className?: string }) {
  return (
    <div className={`relative grid place-items-center ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-brand-red/10 blur-xl" aria-hidden />
      <ExerciseArt art={art} className="relative size-full text-white/85" strokeWidth={1.6} />
    </div>
  );
}
