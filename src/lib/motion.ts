/**
 * ASCEND motion system — shared timing tokens, haptics and reduced-motion helpers.
 * Purely presentational: no business logic lives here.
 */
import { useEffect, useState } from "react";

export const MOTION = {
  fast: 150,
  base: 220,
  slow: 300,
  stagger: 60,
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export type HapticKind = "light" | "medium" | "heavy" | "success" | "celebrate";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  success: [12, 40, 18],
  celebrate: [14, 40, 14, 40, 26],
};

/** Fires a short vibration where supported. Silently no-ops elsewhere. */
export function haptic(kind: HapticKind = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* unsupported — ignore */
  }
}

/** Inline style helper for staggered entrance delays. */
export function stagger(index: number, step = MOTION.stagger) {
  return { animationDelay: `${index * step}ms` } as const;
}
