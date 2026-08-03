import { useEffect, useMemo, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  open: boolean;
  onDone?: () => void;
  title?: string;
  subtitle?: string;
  duration?: number;
};

const COLORS = ["var(--brand-red)", "var(--brand-red-glow)", "#ffffff"];

/**
 * Minimal, tasteful celebration: dark scrim, badge reveal and a short burst of
 * particles. Purely visual — it never changes app state.
 */
export function Celebration({ open, onDone, title = "Session Logged", subtitle, duration = 1900 }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      onDone?.();
    }, prefersReducedMotion() ? 600 : duration);
    return () => window.clearTimeout(t);
  }, [open, duration, onDone]);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        delay: Math.random() * 260,
        size: 5 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        drift: (Math.random() - 0.5) * 40,
      })),
    [open],
  );

  if (!open || !mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-modal grid place-items-center" aria-hidden>
      <div className="absolute inset-0 bg-black/60 animate-reveal-up" />
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-1/3 rounded-full animate-xp-float"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            transform: `translateX(${p.drift}px)`,
          }}
        />
      ))}
      <div className="relative animate-pop rounded-2xl border border-brand-red/50 bg-brand-gray/95 px-8 py-6 text-center shadow-glow-red-strong">
        <p className="chip-label text-brand-red">Ascend</p>
        <p className="text-display mt-1 text-2xl font-bold text-white">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-brand-silver">{subtitle}</p> : null}
      </div>
    </div>
  );
}
