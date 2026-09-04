import { useEffect, useState } from "react";
import { Inbox, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { api, type Application, type Role } from "@/lib/api";
import { formatAmount, formatDate, humanize } from "@/lib/format";

const STATUSES = ["submitted", "assigned", "under_review", "scored", "funded", "rejected"] as const;

export function Queue({ role, onOpen }: { role: Role; onOpen: (id: number) => void }) {
  const [rows, setRows] = useState<Application[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .queue(status || undefined)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="mx-auto grid max-w-4xl gap-5 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Review queue</h2>
          <p className="text-muted-foreground text-sm">
            {role === "admin" ? "Every application across the program." : "Applications assigned to you."}
          </p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="statusFilter" className="text-muted-foreground text-xs">
            Filter by status
          </label>
          <select
            id="statusFilter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm capitalize"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-12 text-center text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
            <Inbox className="size-6" />
            No applications match this view.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="bg-card hover:bg-accent flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{a.title}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 text-xs">
                  <span>Requested {formatAmount(a.requested_amount)}</span>
                  <span>Submitted {formatDate(a.submitted_at)}</span>
                  {a.total_score != null && <span>Total score {a.total_score}</span>}
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
