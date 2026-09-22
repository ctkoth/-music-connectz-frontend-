import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AtSign, Download, Gift, Loader2, Phone, Sparkles, User } from "lucide-react";
import PasswordField from "./PasswordField.jsx";
import { useAuth } from "./AuthContext.jsx";
import OAuthButtons from "./OAuthButtons.jsx";
import { clearTrialToken, storedTrialToken } from "../apps/TrialTake.jsx";
import { clearTrialSplit, storedTrialSplit } from "../apps/BodieZTrial.jsx";
import HabitOnboarding from "../components/HabitOnboarding.jsx";
import { track } from "../track.js";
import { api } from "../api.js";
import { WINDOWS_EXE } from "../downloadBuilds.js";
import RuleNote from "../RuleNote.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = (params.get("ref") || "").trim();
  // A take they had scored at the door, before they had an account to put it
  // in. Registering with the token attaches it — otherwise the trial was a
  // dead end, and the one thing that made them sign up is thrown away.
  const trialToken = storedTrialToken();
  // A week built on the BodieZ trial door's split builder — free, no account,
  // computed client-side. It only survives as real routines if this
  // registration completes; see BodieZTrial.jsx's own comment on why.
  const trialSplit = storedTrialSplit();
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", birthday: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHabitOnboarding, setShowHabitOnboarding] = useState(false);
  // Every tier number this screen states, from the server.
  //
  // It had "3 scored takes/day", "5 scored takes/day", "2x faster Energy" and
  // the two referral amounts typed into the copy — the tenth place a tier
  // number lived, and CLAUDE.md says how that ends. The "2x" was already
  // wrong: the floors are 2 and 6 ⚡/hr, so for somebody reading a SIGNUP page
  // — who has no verified reach and is therefore on the floor — Premium is 3x,
  // and the screen was understating the thing it was selling.
  const [tiers, setTiers] = useState(null);
  const [join, setJoin] = useState(null);
  useEffect(() => {
    let on = true;
    api("/api/economy/tiers/", { auth: false })
      .then((d) => { if (!on) return; if (d?.tiers) setTiers(d.tiers); if (d?.join) setJoin(d.join); })
      // Silent, and the cards render nothing rather than a made-up number.
      .catch(() => {});
    return () => { on = false; };
  }, []);

  // Is this handle free, asked BEFORE the form is submitted.
  //
  // `check-username/` existed the whole time, sat behind IsAuthenticated, and
  // was therefore unreachable from the only screen that needs it — so the way
  // you learned a username was taken was to fill in the whole form and press
  // the button. On blur rather than per keystroke: one request when they move
  // on, no debounce to get wrong.
  const [handle, setHandle] = useState(null);
  // The rule itself, stated BEFORE somebody picks a handle that breaks it —
  // which is the whole point, and is why it is read rather than typed. Seeded
  // by one blank check on mount, because the endpoint answers `rule` whatever
  // it is asked about, and kept fresh from every later answer.
  const [handleRule, setHandleRule] = useState("");

  async function askHandle(u) {
    const r = await api(`/api/auth/check-username/?username=${encodeURIComponent(u)}`,
                        { auth: false });
    if (r?.rule) setHandleRule(r.rule);
    return r;
  }

  useEffect(() => {
    askHandle("").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkHandle() {
    const u = form.username.trim();
    if (!u) return setHandle(null);
    try {
      setHandle(await askHandle(u));
    } catch {
      // A failed check must never block a signup. They press the button and
      // the server decides, exactly as it did before this existed.
      setHandle(null);
    }
  }

  useEffect(() => {
    track("register_view", { has_ref: !!ref, has_trial: !!trialToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ ...form, birthday: form.birthday || null, ref, trial_token: trialToken,
                       trial_split: trialSplit || undefined });
      clearTrialToken();
      clearTrialSplit();
      track("register_success");
      // Show habit onboarding before going home — new users hook into daily returns
      setShowHabitOnboarding(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function completeOnboarding() {
    setShowHabitOnboarding(false);
    navigate("/");
  }

  return (
    <>
    <AuthShell title="Create your account" subtitle="Free to join — post your work, get real feedback, and get paid for it.">
      {ref && (
        <div className="flex items-center gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-sm text-mcz-ember">
          <Gift size={15} /> Invited by <span className="font-semibold">{ref}</span>
          {join ? (
            <> — <span className="font-semibold">+{join.joinee_spinaz} 🍥</span> for you,
              +{join.referrer_spinaz} 🍥 for them. Both sides, because both sides show up.</>
          ) : null}
        </div>
      )}
      {trialToken && (
        <div className="flex items-center gap-2 rounded-lg border border-mcz-cyan/30 bg-mcz-cyan/10 px-3 py-2 text-sm text-mcz-cyan">
          <Sparkles size={15} /> Your scored take is waiting — it saves to this account.
        </div>
      )}
      {/* The one-account rule, on the one screen where somebody is about to
          make a second one. Read from the server (`rulez.js`) rather than
          typed here, so the rule a member is shown and the rule the code
          enforces are the same sentence. */}
      <RuleNote rule="one_account" />

      {/* The gain, before the button. SIGNUP_WELCOME_SPINAZ has been paid on
          every registration since it was written and no screen ever said so —
          the cost/gain rule's other half, and the half that gets forgotten. A
          reward found out by accident is a coincidence, and a coincidence
          changes nobody's behaviour. */}
      {join?.welcome_spinaz > 0 && !ref && (
        <p className="text-sm text-emerald-300">
          <span className="font-semibold">+{join.welcome_spinaz} 🍥</span> in your balance the moment you join.
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <Field icon={User} placeholder="Username" value={form.username}
                 onChange={(e) => { setHandle(null); set("username")(e); }}
                 onBlur={checkHandle} autoComplete="username" />
          {/* The server's sentence, never a reworded one — it is the same
              `username_problem` the register endpoint refuses with, so the
              form and the submit can never disagree about why. */}
          {handle && (
            <p className={`mt-1 text-[11px] ${handle.available ? "text-emerald-300" : "text-mcz-pink"}`}>
              {handle.available ? `${form.username.trim()} is free.` : handle.reason}
            </p>
          )}
          {!handle && handleRule && <p className="mt-1 text-[11px] text-white/35">{handleRule}</p>}
        </div>
        <Field icon={AtSign} type="email" placeholder="Email" value={form.email} onChange={set("email")} autoComplete="email" />
        <Field icon={Phone} type="tel" placeholder="Phone number (optional)" value={form.phone} onChange={set("phone")} autoComplete="tel" required={false} />
        <div className="relative">
          <input type="date" className="neon-input" value={form.birthday} onChange={set("birthday")}
                 aria-label="Birthday (for ZodiacZ)" />
          <p className="mt-1 text-[11px] text-white/35">Birthday (optional) — unlocks your ZodiacZ sign</p>
        </div>
        <PasswordField placeholder="Password (8+ characters)" value={form.password} onChange={set("password")} autoComplete="new-password" />

        {error && <p className="text-sm text-mcz-pink">{error}</p>}

        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null}
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <OAuthButtons onSuccess={() => navigate("/")} onError={setError} />

      <p className="pt-2 text-center text-sm text-white/55">
        Already have an account?{" "}
        <Link to="/login" className="text-mcz-cyan hover:underline">
          Log in
        </Link>
      </p>

      {/* What you unlock — same pattern as TrialTake, so all new users see
          tier differentiation upfront, whether they came via trial or direct signup */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-white/50">
          Start free, upgrade anytime
        </p>
        {/* Every number here is the server's.
          *
          * "Advanced analytics" and "Priority support" used to sit on the
          * Premium card and neither exists anywhere in the codebase — a
          * signup page selling two features that were never built. Gone. What
          * is listed now is what the ladder actually ladders, and it is read
          * from /api/economy/tiers/ so it cannot drift from what a member
          * gets. The card renders only when the fetch succeeded: no tiers
          * means no card, never an invented figure. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(tiers || []).filter((t) => t.key === "free" || t.key === "premium").map((t) => (
            <div key={t.key}
                 className={`rounded-lg border p-3 ${t.key === "free"
                   ? "border-emerald-300/20 bg-emerald-300/5"
                   : "border-mcz-gold/30 bg-mcz-gold/5"}`}>
              <p className={`mb-2 font-semibold ${t.key === "free" ? "text-emerald-300" : "text-mcz-gold"}`}>
                {t.label}
              </p>
              <ul className="space-y-1 text-[11px] text-white/75">
                {t.key === "premium" && <li>✓ Everything in Free</li>}
                <li>✓ Keep all your takes</li>
                <li>✓ {t.daily_prompts} AI runs/day — coach, OCC, DirectZ</li>
                <li>✓ {t.energy_per_hour} ⚡/hour</li>
                <li>✓ {t.upload_mb >= 1024 ? `${Math.round(t.upload_mb / 1024)}GB` : `${t.upload_mb}MB`} per upload</li>
                <li>✓ Post, rate and earn 🍥</li>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </AuthShell>

    {showHabitOnboarding && <HabitOnboarding appKey="singz" onComplete={completeOnboarding} />}
    </>
  );
}

function Field({ icon: Icon, required = true, ...props }) {
  // `required` used to be inferred from the placeholder text ("Phone number"
  // was the one field this compared against), so renaming or rewording any
  // placeholder silently changed what the form would block on. It's an
  // explicit prop now — the one field that is optional (phone) says so, and
  // nothing here can make a field required by accident again.
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
      <input className="neon-input pl-10" {...props} required={required} />
    </div>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center gap-3">
        <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-12 w-12 rounded-xl shadow-neon" />
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-white/55">{subtitle}</p>}
        </div>
      </div>
      <div className="neon-frame space-y-5 p-6">{children}</div>

      {/* Free, no account needed — the desktop build loads the live site, so
          it's always whatever the web app is, never a version behind it. */}
      <a
        href={WINDOWS_EXE.href}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-sm transition hover:border-mcz-cyan/50"
      >
        <Download size={15} className="shrink-0 text-mcz-cyan" />
        <div>
          <span className="font-semibold text-white">{WINDOWS_EXE.emoji} Download for Windows (.exe)</span>
          <span className="ml-1.5 text-emerald-300">Free</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            {WINDOWS_EXE.note} Unsigned build — SmartScreen: More info → Run anyway.
          </p>
        </div>
      </a>
    </div>
  );
}
