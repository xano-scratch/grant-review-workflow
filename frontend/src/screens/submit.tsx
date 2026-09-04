import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { api, type Program, type Application } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/format";

export function Submit() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Application | null>(null);

  useEffect(() => {
    api.programs().then((rows) => {
      setPrograms(rows);
      const open = rows.find((p) => p.status === "open") ?? rows[0];
      if (open) setProgramId(open.id);
    });
  }, []);

  const program = programs.find((p) => p.id === programId) ?? null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (programId == null) return;
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const app = await api.submit({
        program_id: programId,
        title,
        summary,
        requested_amount: Number(amount),
      });
      setCreated(app);
      setTitle("");
      setSummary("");
      setAmount("");
    } catch (e) {
      // The API rejects a bad submission with a clear reason — show it verbatim.
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Submit an application</h2>
        <p className="text-muted-foreground text-sm">
          The backend validates intake: the program must be open, the deadline must not have passed, and the
          amount must be within the funding cap.
        </p>
      </div>

      {created && (
        <Card className="border-emerald-500/30">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <div>
              <CardTitle className="text-base">Application received</CardTitle>
              <CardDescription>Intake validation passed. It now enters the review queue.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="font-medium">{created.title}</span>
            <StatusBadge status={created.status} />
            <span className="text-muted-foreground">Requested {formatAmount(created.requested_amount)}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="program">Program</Label>
              <select
                id="program"
                value={programId ?? ""}
                onChange={(e) => setProgramId(Number(e.target.value))}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.status === "closed" ? "(closed)" : ""}
                  </option>
                ))}
              </select>
              {program && (
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <StatusBadge status={program.status} />
                  <span>Cap {formatAmount(program.max_request)}</span>
                  <span>Deadline {formatDate(program.submission_deadline)}</span>
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="title">Project title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Fiber to the Library District" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} required rows={3} placeholder="What the funding pays for and who it serves." />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="amount">Requested funding</Label>
              <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="150000" />
              {program && (
                <button
                  type="button"
                  onClick={() => setAmount(String(program.max_request + 50000))}
                  className="text-muted-foreground hover:text-foreground w-fit text-xs underline underline-offset-2"
                >
                  Fill an over-cap amount (to see intake rejection)
                </button>
              )}
            </div>

            {error && (
              <div className="text-destructive flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={busy || programId == null}>
              <Send className="size-4" /> {busy ? "Submitting…" : "Submit application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
