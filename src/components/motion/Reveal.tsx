import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MOTION } from "@/lib/motion";

type Props = {
  children: ReactNode;
  /** Stagger index — each step adds 60ms of delay. */
  index?: number;
  delay?: number;
  className?: string;
  as?: ElementType;
  /** Animate only once it scrolls into view (default: animate immediately on mount). */
  onScroll?: boolean;
};

/**
 * Fade + slide-up entrance. GPU-accelerated (opacity/transform only) and
 * automatically disabled under prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  index = 0,
  delay,
  className,
  as: Tag = "div",
  onScroll = false,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!onScroll);

  useEffect(() => {
    if (!onScroll || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onScroll, visible]);

  return (
    <Tag
      ref={ref as never}
      className={cn(visible ? "animate-reveal-up" : "opacity-0", className)}
      style={{ animationDelay: `${delay ?? index * MOTION.stagger}ms` }}
    >
      {children}
    </Tag>
  );
}
