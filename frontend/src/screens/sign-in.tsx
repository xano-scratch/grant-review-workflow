import { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginBody } from "@/lib/api";

// The three seeded accounts, one per role, so RBAC is visible in one click.
const DEMO_ACCOUNTS = [
  { label: "Applicant", email: "casey.kim@example.org", password: "applicant-demo", blurb: "Submit an application" },
  { label: "Reviewer", email: "blair.chen@agency.gov", password: "reviewer-demo", blurb: "Score an assigned application" },
  { label: "Admin", email: "alex.rivera@agency.gov", password: "admin-demo", blurb: "Assign reviewers, fund or reject" },
] as const;

export function SignIn({ onLogin }: { onLogin: (body: LoginBody) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(body: LoginBody) {
    setBusy(true);
    setError(null);
    try {
      await onLogin(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Grant Review Workflow</h1>
        <p className="text-muted-foreground text-sm">
          Sign in with a seeded account. Each role sees a different governed view.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick sign in</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              disabled={busy}
              onClick={() => go({ email: a.email, password: a.password })}
              className="hover:bg-accent flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50"
            >
              <span>
                <span className="block text-sm font-medium">{a.label}</span>
                <span className="text-muted-foreground block text-xs">{a.blurb}</span>
              </span>
              <LogIn className="text-muted-foreground size-4" />
            </button>
          ))}
        </CardContent>
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void go({ email, password });
        }}
        className="grid gap-3"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.gov" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
