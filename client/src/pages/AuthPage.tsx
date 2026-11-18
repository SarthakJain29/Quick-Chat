import { ArrowRight, Loader2, Sparkles, Wand2, Zap } from "lucide-react";
import { useState } from "react";
import { Logo } from "../components/Logo";
import { useAuth } from "../store/auth";

const PERKS = [
  { icon: Zap, title: "Instant delivery", text: "WebSocket-powered messages, typing and read receipts." },
  { icon: Sparkles, title: "AI smart replies", text: "One-tap suggestions and chat summaries." },
  { icon: Wand2, title: "Tone rewrite", text: "Make a draft friendlier, sharper or more professional." },
];

export function AuthPage() {
  const { signIn, busy } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ fullName: "", email: "", password: "", bio: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => { e.preventDefault(); void signIn(mode, f); };
  const demo = () => void signIn("login", { email: "demo@quickchat.dev", password: "demo1234" });

  return (
    <main className="mx-auto grid min-h-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr]">
      <section className="animate-rise">
        <Logo size={34} />
        <h1 className="mt-8 font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
          Say it <span className="grad-text">faster.</span><br />Say it <span className="grad-text">better.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-white/60">Real-time chat with an AI sidekick built in: smart replies, instant summaries and tone rewrite, right where you type.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="glass rounded-2xl p-4">
              <Icon size={18} className="mb-3 text-violet-300" />
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-white/50">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="glass animate-rise rounded-[2rem] p-7 sm:p-9 [animation-delay:.1s]">
        <div className="mb-6 flex rounded-full bg-white/6 p-1 text-sm font-semibold" role="tablist">
          {(["login", "signup"] as const).map((m) => (
            <button type="button" key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex-1 rounded-full py-2 transition ${mode === m ? "grad-bg text-white" : "text-white/55 hover:text-white"}`}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "signup" && <input className="field" placeholder="Full name" value={f.fullName} onChange={set("fullName")} required maxLength={60} autoComplete="name" />}
          <input className="field" type="email" placeholder="Email" value={f.email} onChange={set("email")} required autoComplete="email" />
          <input className="field" type="password" placeholder="Password (min 6 characters)" value={f.password} onChange={set("password")} required minLength={mode === "signup" ? 6 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "signup" && <textarea className="field resize-none" rows={2} placeholder="Short bio (optional)" value={f.bio} onChange={set("bio")} maxLength={200} />}
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <>{mode === "login" ? "Log in" : "Create account"} <ArrowRight size={18} /></>}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-white/30"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
        <button type="button" onClick={demo} disabled={busy} className="btn btn-ghost w-full border border-white/15 py-3">Try the demo account</button>
        <p className="mt-4 text-center text-xs text-white/35">Demo: demo@quickchat.dev / demo1234 (available when the server runs in demo mode)</p>
      </form>
    </main>
  );
}
