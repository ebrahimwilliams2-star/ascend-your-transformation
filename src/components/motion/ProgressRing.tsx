import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
};

/** Circular XP/progress ring that draws itself smoothly on mount and on change. */
export function ProgressRing({ value, size = 96, stroke = 8, className, children }: Props) {
  const [v, setV] = useState(prefersReducedMotion() ? value : 0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, v)) / 100) * c;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-brand-red"
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      ) : null}
    </div>
  );
}
