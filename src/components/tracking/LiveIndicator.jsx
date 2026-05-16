import { cn } from "@/lib/utils";
import useLiveClock, { formatLastUpdated } from "@/hooks/useLiveClock";

export function LiveDot({ active = true, className, size = "sm" }) {
  return (
    <span
      className={cn(
        "rounded-full shrink-0",
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
        active ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500",
        className
      )}
      aria-hidden
    />
  );
}

export function LiveBadge({ label = "Live", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700",
        className
      )}
    >
      <LiveDot />
      {label}
    </span>
  );
}

export function LastUpdatedText({ timestamp, prefix = "Updated", className }) {
  const now = useLiveClock(1000);
  const text = formatLastUpdated(timestamp, now);

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums", className)}>
      <LiveDot active={text === "Just now" || text.includes("sec ago")} size="sm" />
      <span>
        {prefix} {text}
      </span>
    </span>
  );
}
