import { useEffect, useState } from "react";
import { LogOut, ClipboardList, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignIn } from "@/screens/sign-in";
import { Submit } from "@/screens/submit";
import { Queue } from "@/screens/queue";
import { Detail } from "@/screens/detail";
import { api, setToken, getToken, type LoginBody, type User } from "@/lib/api";

type Session = { token: string; user: User };
type View = "submit" | "queue" | "detail";

const USER_KEY = "grw.user";

// The seeded accounts, used by the ?demo=<role> deep link to auto-sign-in.
const DEMO_ACCOUNTS: Record<string, LoginBody> = {
  applicant: { email: "casey.kim@example.org", password: "applicant-demo" },
  reviewer: { email: "blair.chen@agency.gov", password: "reviewer-demo" },
  admin: { email: "alex.rivera@agency.gov", password: "admin-demo" },
};

function loadSession(): Session | null {
  try {
    const token = getToken();
    const raw = localStorage.getItem(USER_KEY);
    if (token && raw) return { token, user: JSON.parse(raw) as User };
  } catch {
    /* ignore */
  }
  return null;
}

function persist(session: Session | null) {
  setToken(session?.token ?? null);
  if (typeof localStorage === "undefined") return;
  if (session) localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  else localStorage.removeItem(USER_KEY);
}

function homeView(user: User): View {
  return user.role === "applicant" ? "submit" : "queue";
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("queue");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      // Make sure the ephemeral has data — the seed is idempotent, so this is safe
      // to call on every load and never wipes live work.
      try {
        await api.seed();
      } catch {
        /* seed is best-effort */
      }

      const params = new URLSearchParams(window.location.search);
      const demo = params.get("demo");
      const appParam = params.get("app");

      let sess = loadSession();
      if (!sess && demo && DEMO_ACCOUNTS[demo]) {
        try {
          const res = await api.login(DEMO_ACCOUNTS[demo]);
          sess = { token: res.token, user: res.user };
          persist(sess);
        } catch {
          /* fall through to sign-in */
        }
      }

      if (sess) {
        setSession(sess);
        if (appParam && sess.user.role !== "applicant") {
          setSelectedAppId(Number(appParam));
          setView("detail");
        } else {
          setView(homeView(sess.user));
        }
      }
      setBooting(false);
    })();
  }, []);

  async function handleLogin(body: LoginBody) {
    const res = await api.login(body);
    const sess: Session = { token: res.token, user: res.user };
    persist(sess);
    setSession(sess);
    setSelectedAppId(null);
    setView(homeView(res.user));
  }

  function signOut() {
    persist(null);
    setSession(null);
    setSelectedAppId(null);
  }

  function openApp(id: number) {
    setSelectedAppId(id);
    setView("detail");
  }

  if (booting) {
    return <div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="bg-background min-h-screen">
        <SignIn onLogin={handleLogin} />
      </div>
    );
  }

  const { user } = session;
  const isReviewerOrAdmin = user.role === "reviewer" || user.role === "admin";

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-card/50 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">Grant Review Workflow</span>
            <span className="hidden gap-1.5 sm:flex">
              <Chip>Play 3 · Pilot to Production</Chip>
              <Chip>Government</Chip>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm leading-tight font-medium">{user.name}</div>
              <div className="text-muted-foreground text-xs capitalize">{user.role}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>

        {/* Applicants submit; reviewers and admins work the queue. */}
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          {user.role === "applicant" ? (
            <Tab active={view === "submit"} onClick={() => setView("submit")} icon={<Send className="size-4" />}>
              Submit
            </Tab>
          ) : (
            <Tab
              active={view === "queue" || view === "detail"}
              onClick={() => {
                setSelectedAppId(null);
                setView("queue");
              }}
              icon={<ClipboardList className="size-4" />}
            >
              Review queue
            </Tab>
          )}
        </div>
      </header>

      <main>
        {view === "submit" && <Submit />}
        {view === "queue" && isReviewerOrAdmin && <Queue role={user.role} onOpen={openApp} />}
        {view === "detail" && selectedAppId != null && (
          <Detail
            appId={selectedAppId}
            me={user}
            onBack={() => {
              setSelectedAppId(null);
              setView("queue");
            }}
          />
        )}
      </main>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

function Tab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
        (active ? "border-primary text-foreground" : "text-muted-foreground border-transparent hover:text-foreground")
      }
    >
      {icon}
      {children}
    </button>
  );
}
