import { cn } from "@/lib/utils";

interface PosKeyBadgeProps {
  label: string;
  title?: string;
  tone?: "default" | "onDark" | "onPrimary";
  size?: "sm" | "md";
  className?: string;
}

/** Phone-keypad style shortcut chip for POS actions and product tiles. */
export function PosKeyBadge({
  label,
  title,
  tone = "default",
  size = "sm",
  className,
}: PosKeyBadgeProps) {
  return (
    <span
      title={title ?? `اختصار: ${label}`}
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[7px] font-mono font-bold tabular-nums leading-none shadow-[inset_0_-1px_0_rgba(15,26,53,0.12),0_1px_0_rgba(255,255,255,0.35)]",
        size === "sm" && "min-w-5 h-5 px-1 text-[10px]",
        size === "md" && "min-w-7 h-7 px-1.5 text-xs",
        tone === "default" &&
          "pos-key-surface bg-gradient-to-b from-cream-50 to-cream-100 text-cacao-800",
        tone === "onDark" &&
          "border border-white/35 bg-cacao-950/85 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-sm",
        tone === "onPrimary" &&
          "border border-white/25 bg-black/20 text-primary-foreground shadow-none",
        className,
      )}
    >
      {label}
    </span>
  );
}
