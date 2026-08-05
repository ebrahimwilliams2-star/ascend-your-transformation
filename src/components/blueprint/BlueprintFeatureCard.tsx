import { Link } from "@tanstack/react-router";
import { Dumbbell, ChevronRight } from "lucide-react";
import { haptic } from "@/lib/motion";

/** Featured Ethan's Blueprint card — pinned to the top of the Workout tab. */
export function BlueprintFeatureCard() {
  return (
    <Link
      to="/blueprint"
      onClick={() => haptic("medium")}
      className="tap blueprint-shimmer relative mx-6 block overflow-hidden rounded-3xl border border-brand-red/35 bg-black p-6 shadow-glow-red"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-red/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-red/15 ring-1 ring-brand-red/40">
          <Dumbbell className="size-4 text-brand-red" />
        </span>
        <p className="chip-label text-brand-red">Ethan's Blueprint</p>
      </div>
      <p className="relative mt-3 text-display text-2xl font-bold leading-tight">
        Simple. Effective. Proven.
      </p>
      <p className="relative mt-2 text-sm text-brand-silver">
        Train exactly how Ethan trains his community.
      </p>
      <p className="relative mt-1 text-sm font-semibold text-white/90">
        Become 1% Better Than Yesterday.
      </p>
      <span className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white">
        Start Blueprint <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}
