import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calculator, ClipboardList, History, ShieldCheck, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  api,
  type ApplicationDetail,
  type Reviewer,
  type User,
} from "@/lib/api";
import { formatAmount, formatDate, formatDateTime, humanize } from "@/lib/format";

export function Detail({ appId, me, onBack }: { appId: number; me: User; onBack: () => void }) {
  const [d, setD] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setD(await api.detail(appId));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not load the application.");
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading && !d) return <p className="text-muted-foreground py-16 text-center text-sm">Loading…</p>;
  if (!d || !d.application)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BackLink onBack={onBack} />
        <p className="text-muted-foreground py-16 text-center text-sm">{notice ?? "Application not found."}</p>
      </div>
    );

  const app = d.application;

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <BackLink onBack={onBack} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{app.title}</CardTitle>
              <CardDescription className="mt-1">{app.summary}</CardDescription>
            </div>
            <StatusBadge status={app.status} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Field label="Program" value={d.program?.name ?? "—"} />
          <Field label="Applicant" value={d.applicant?.name ?? "—"} />
          <Field label="Requested" value={formatAmount(app.requested_amount)} />
          <Field label="Weighted total" value={app.total_score != null ? String(app.total_score) : "Not computed"} />
        </CardContent>
      </Card>

      {notice && <p className="text-destructive text-sm">{notice}</p>}

      <Scoring detail={d} me={me} onChanged={reload} setNotice={setNotice} />

      {me.role === "admin" && <Administration detail={d} onChanged={reload} setNotice={setNotice} />}

      <AuditTrail detail={d} />
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm">
      <ArrowLeft className="size-4" /> Back to queue
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

// --- Rubric + scoring + the weighted-total breakdown ---
function Scoring({
  detail,
  me,
  onChanged,
  setNotice,
}: {
  detail: ApplicationDetail;
  me: User;
  onChanged: () => Promise<void>;
  setNotice: (s: string | null) => void;
}) {
  const app = detail.application!;
  const canScore = me.role === "reviewer";
  const [drafts, setDrafts] = useState<Record<number, { points: string; note: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);

  // Seed the inputs from any score this reviewer already recorded.
  useEffect(() => {
    const next: Record<number, { points: string; note: string }> = {};
    for (const c of detail.criteria) {
      const mine = detail.scores.find((s) => s.criteria_id === c.id && s.reviewer_id === me.id);
      next[c.id] = { points: mine ? String(mine.points) : "", note: mine?.note ?? "" };
    }
    setDrafts(next);
  }, [detail, me.id]);

  const scoreOf = (critId: number) => detail.scores.find((s) => s.criteria_id === critId) ?? null;
  const allScored = detail.criteria.length > 0 && detail.criteria.every((c) => scoreOf(c.id) != null);
  const liveTotal = useMemo(
    () =>
      detail.criteria.reduce((sum, c) => {
        const s = scoreOf(c.id);
        return s ? sum + c.weight * s.points : sum;
      }, 0),
    [detail],
  );

  async function save(critId: number, max: number) {
    const draft = drafts[critId];
    const points = Number(draft?.points);
    if (draft?.points === "" || Number.isNaN(points)) {
      setNotice("Enter a score first.");
      return;
    }
    setSavingId(critId);
    setNotice(null);
    try {
      await api.score({
        application_id: app.id,
        criteria_id: critId,
        points,
        note: draft?.note || undefined,
      });
      await onChanged();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : `Could not save (0–${max}).`);
    } finally {
      setSavingId(null);
    }
  }

  async function compute() {
    setComputing(true);
    setNotice(null);
    try {
      await api.compute(app.id);
      await onChanged();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not compute the total.");
    } finally {
      setComputing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="text-muted-foreground size-4" /> Published rubric
        </CardTitle>
        <CardDescription>
          Active version {detail.criteria[0]?.version ?? "—"}. The weighted total is the sum of weight times points
          across every active criterion.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {detail.criteria.map((c) => {
          const s = scoreOf(c.id);
          const draft = drafts[c.id] ?? { points: "", note: "" };
          return (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">{c.label}</div>
                <div className="text-muted-foreground text-xs">
                  weight {c.weight} · max {c.max_points}
                </div>
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">{c.description}</p>

              {canScore ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="grid gap-1">
                    <label className="text-muted-foreground text-xs">Points</label>
                    <Input
                      type="number"
                      min={0}
                      max={c.max_points}
                      value={draft.points}
                      onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...draft, points: e.target.value } }))}
                      className="w-24"
                    />
                  </div>
                  <Input
                    placeholder="Note (optional)"
                    value={draft.note}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...draft, note: e.target.value } }))}
                    className="min-w-40 flex-1"
                  />
                  <Button variant="secondary" size="sm" disabled={savingId === c.id} onClick={() => save(c.id, c.max_points)}>
                    {savingId === c.id ? "Saving…" : s ? "Update" : "Save"}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 text-sm">
                  {s ? (
                    <span>
                      <span className="font-medium">{s.points}</span>
                      <span className="text-muted-foreground"> / {c.max_points}</span>
                      {s.note && <span className="text-muted-foreground"> · {s.note}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not scored yet</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Weighted-total breakdown — the governed result made explicit. */}
        <div className="bg-muted/40 rounded-lg border p-3">
          <div className="text-muted-foreground grid grid-cols-4 gap-2 text-xs font-medium">
            <span>Criterion</span>
            <span className="text-right">Weight</span>
            <span className="text-right">Points</span>
            <span className="text-right">Weighted</span>
          </div>
          {detail.criteria.map((c) => {
            const s = scoreOf(c.id);
            return (
              <div key={c.id} className="grid grid-cols-4 gap-2 py-1 text-sm">
                <span className="truncate">{c.label}</span>
                <span className="text-right">{c.weight}</span>
                <span className="text-right">{s ? s.points : "—"}</span>
                <span className="text-right">{s ? c.weight * s.points : "—"}</span>
              </div>
            );
          })}
          <div className="mt-1 flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Weighted total {app.total_score == null ? "(preview)" : ""}</span>
            <span>{app.total_score ?? liveTotal}</span>
          </div>
        </div>

        {(me.role === "reviewer" || me.role === "admin") && (
          <div className="flex items-center gap-3">
            <Button onClick={compute} disabled={computing || !allScored}>
              <Calculator className="size-4" /> {computing ? "Computing…" : "Compute weighted total"}
            </Button>
            {!allScored && <span className="text-muted-foreground text-xs">Score every criterion to enable this.</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Admin: assign a reviewer, fund or reject ---
function Administration({
  detail,
  onChanged,
  setNotice,
}: {
  detail: ApplicationDetail;
  onChanged: () => Promise<void>;
  setNotice: (s: string | null) => void;
}) {
  const app = detail.application!;
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [reviewerId, setReviewerId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.reviewers().then((rows) => {
      setReviewers(rows);
      if (rows[0]) setReviewerId(rows[0].id);
    });
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const decided = app.status === "funded" || app.status === "rejected";

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="text-muted-foreground size-4" /> Administration
        </CardTitle>
        <CardDescription>Assign a reviewer, then fund or reject once a weighted total exists.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-muted-foreground text-xs">Reviewer</label>
            <select
              value={reviewerId ?? ""}
              onChange={(e) => setReviewerId(Number(e.target.value))}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            disabled={busy || reviewerId == null}
            onClick={() => run(() => api.assign({ application_id: app.id, reviewer_id: reviewerId! }))}
          >
            <UserPlus className="size-4" /> Assign
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={busy || app.status !== "scored"}
            onClick={() => run(() => api.decide({ application_id: app.id, decision: "funded" }))}
          >
            <Check className="size-4" /> Fund
          </Button>
          <Button
            variant="destructive"
            disabled={busy || app.status !== "scored"}
            onClick={() => run(() => api.decide({ application_id: app.id, decision: "rejected" }))}
          >
            <X className="size-4" /> Reject
          </Button>
          {decided ? (
            <span className="text-muted-foreground text-xs">
              Decision recorded: <span className="capitalize">{app.status}</span>.
            </span>
          ) : (
            app.status !== "scored" && (
              <span className="text-muted-foreground text-xs">Compute the weighted total before deciding.</span>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- The append-only audit trail, rendered inline ---
function AuditTrail({ detail }: { detail: ApplicationDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="text-muted-foreground size-4" /> Audit trail
        </CardTitle>
        <CardDescription>Every state-changing action, in order.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative grid gap-4 pl-4">
          <span className="bg-border absolute top-1 bottom-1 left-[3px] w-px" aria-hidden />
          {detail.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="bg-primary absolute top-1.5 -left-4 size-1.5 rounded-full" aria-hidden />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium capitalize">{humanize(e.action)}</span>
                <span className="text-muted-foreground text-xs">{formatDateTime(e.created_at)}</span>
              </div>
              {e.detail != null && (
                <pre className="text-muted-foreground mt-0.5 overflow-x-auto text-xs">{renderDetail(e.detail)}</pre>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function renderDetail(detail: unknown): string {
  if (detail == null || typeof detail !== "object") return String(detail ?? "");
  return Object.entries(detail as Record<string, unknown>)
    .map(([k, v]) => `${humanize(k)}: ${v}`)
    .join("  ·  ");
}
