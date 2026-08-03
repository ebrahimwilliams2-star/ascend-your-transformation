import { cn } from "@/lib/utils";

/** Shimmering placeholder block — replaces spinners across the app. */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.06] animate-shimmer-bg",
        className,
      )}
      aria-hidden
    />
  );
}

/** Card-shaped skeleton used while dashboard/list data loads. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-brand-gray/60 p-5", className)}>
      <Shimmer className="h-3 w-24" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Shimmer key={i} className="h-3" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-16" />
      ))}
    </div>
  );
}
