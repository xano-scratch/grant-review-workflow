import { cn } from "@/lib/utils";
import { humanize } from "@/lib/format";

// A status system needs distinct, readable colors, so this maps each state to a
// subtle tinted pill on top of the neutral theme.
const STYLES: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground border-border",
  assigned: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  under_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  scored: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  funded: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  open: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {humanize(status)}
    </span>
  );
}
