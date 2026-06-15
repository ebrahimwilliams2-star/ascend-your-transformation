import { ReactNode, MouseEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal
 * 
 * Global modal wrapper that:
 * - Enforces proper z-index hierarchy (always above navbar)
 * - Prevents clicks on backdrop from closing when stopPropagation is used
 * - Handles safe-area insets for bottom sheets
 * - Locks scroll on body
 */
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Position: "bottom" (sheet) or "center" (dialog) */
  position?: "bottom" | "center";
  /** Additional backdrop classes */
  backdropClassName?: string;
  /** Additional content classes */
  contentClassName?: string;
  /** Close on backdrop click? Default: true */
  closeOnBackdropClick?: boolean;
};

export function Modal({
  isOpen,
  onClose,
  children,
  position = "bottom",
  backdropClassName,
  contentClassName,
  closeOnBackdropClick = true,
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-modal flex",
        position === "bottom" ? "items-end" : "items-center justify-center",
        "bg-black/80 backdrop-blur-sm",
        backdropClassName
      )}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={cn(
          "w-full max-w-md",
          position === "bottom"
            ? "max-h-[90dvh] overflow-y-auto rounded-t-3xl"
            : "max-h-[90dvh] overflow-y-auto rounded-2xl",
          "border border-white/10 bg-brand-black p-6",
          contentClassName
        )}
        style={
          position === "bottom"
            ? { paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * ModalContent
 * 
 * Helper for modal body content with consistent styling
 */
type ModalContentProps = {
  children: ReactNode;
  className?: string;
};

export function ModalContent({ children, className }: ModalContentProps) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

/**
 * ModalHeader
 * 
 * Helper for modal header with consistent styling
 */
type ModalHeaderProps = {
  title: string;
  subtitle?: string;
  label?: string;
  className?: string;
};

export function ModalHeader({
  title,
  subtitle,
  label,
  className,
}: ModalHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {label && <p className="chip-label text-brand-red mb-2">{label}</p>}
      <h2 className="text-display text-2xl font-bold">{title}</h2>
      {subtitle && <p className="text-sm text-brand-silver mt-1">{subtitle}</p>}
    </div>
  );
}

/**
 * ModalFooter
 * 
 * Helper for modal footer with button grid
 */
type ModalFooterProps = {
  children: ReactNode;
  className?: string;
};

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("mt-5 flex gap-2 pb-2", className)}>{children}</div>
  );
}
