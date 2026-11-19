// The frame every sign-in screen sits in. Its own file so the screens that only need the frame (OAuth callback,
// forgot / reset password, log in) do not pull the whole sign-up screen into the first download.
import { Download } from "lucide-react";
import { recommendedBuild, alternateBuild } from "../downloadBuilds.js";

export const STANDALONE_NAME = { bodiez: "BodieZ", sentencez: "Sentence ConnectZ", intelligencez: "IntelligenceZ", skillz: "SkillZ" };

export function AuthShell({ title, subtitle, children }) {
  const build = import.meta.env.VITE_STANDALONE ? null : recommendedBuild();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center gap-3">
        <img src="/logo.png?v=2" alt={import.meta.env.VITE_STANDALONE ? (STANDALONE_NAME[import.meta.env.VITE_STANDALONE] || "") : "Music ConnectZ"} className="h-12 w-12 rounded-xl shadow-neon" />
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-white/55">{subtitle}</p>}
        </div>
      </div>
      <div className="neon-frame space-y-5 p-6">{children}</div>

      {/* Free, no account needed — both builds load the live site, so they're
          always whatever the web app is, never a version behind it. Picks
          Android on an Android visitor rather than defaulting to Windows for
          everyone; SpecZ (inside the app) still lists every option. */}
      {build && (
      <a
        href={build.href}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-sm transition hover:border-mcz-cyan/50"
      >
        <Download size={15} className="shrink-0 text-mcz-cyan" />
        <div>
          <span className="font-semibold text-white">
            {build.emoji} Download for {build.key === "android" ? "Android (.apk)" : "Windows (.exe)"}
          </span>
          <span className="ml-1.5 text-emerald-300">Free</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">
            {build.note} {build.key === "android"
              ? "You'll need to allow installs from this source."
              : "Unsigned build — SmartScreen: More info → Run anyway."}
          </p>
        </div>
      </a>
      )}
      {!import.meta.env.VITE_STANDALONE && alternateBuild() && (
        <a href={alternateBuild().href} target="_blank" rel="noreferrer"
           className="mt-1.5 block text-center text-[11px] text-mcz-cyan hover:underline">
          {alternateBuild().emoji} On Android? Get the {alternateBuild().label} instead
        </a>
      )}
    </main>
  );
}
