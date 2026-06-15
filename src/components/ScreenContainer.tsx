import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * ScreenContainer
 *
 * Wraps a screen's scrollable content and guarantees it never sits behind
 * the floating bottom navigation. Adds bottom padding equal to:
 *   nav height (≈ 7rem, including the protruding center FAB)
 *   + the device safe-area inset (iOS home indicator, Android gesture bar)
 *
 * Use this for any route or modal that scrolls. Pair with `viewport-fit=cover`
 * (already set in __root.tsx) so `env(safe-area-inset-bottom)` resolves on iOS.
 */
type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Add extra px on top of the standard nav clearance (e.g. for a floating CTA). */
  extraBottom?: number;
  as?: "div" | "section" | "main";
};

export function ScreenContainer({
  children,
  className,
  extraBottom = 0,
  as: Tag = "div",
  style,
  ...rest
}: Props) {
  return (
    <Tag
      {...rest}
      style={{
        paddingBottom: `calc(7rem + env(safe-area-inset-bottom) + ${extraBottom}px)`,
        ...style,
      }}
      className={cn("w-full", className)}
    >
      {children}
    </Tag>
  );
}
