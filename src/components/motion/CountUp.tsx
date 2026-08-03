import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  value: number;
  duration?: number;
  className?: string;
  format?: (v: number) => string;
  decimals?: number;
};

/**
 * Animated numeric count-up. Starts from the previous value so live updates
 * (XP gains, weight changes) tick upward instead of snapping.
 */
export function CountUp({ value, duration = 900, className, format, decimals = 0 }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const delta = value - from;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
        rafRef.current = null;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const rounded = decimals > 0 ? Number(display.toFixed(decimals)) : Math.round(display);
  return <span className={className}>{format ? format(rounded) : rounded.toLocaleString()}</span>;
}
