import SkillZPanel from "../skillz/SkillZPanel.jsx";

export default function MimeZ() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <img src="/icons/mimez.png" alt="MimeZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-mcz-pink drop-shadow-[0_0_12px_rgba(255,43,209,0.5)]">
            MimeZ
          </h2>
          <p className="text-sm text-white/60">Mime lipsyncs, selfies, and dance training.</p>
          <span className="pill mt-1 inline-block">Teen-safe</span>
        </div>
        <img
          src="/icons/personaz_mime.png"
          alt="Mime PersonaZ"
          className="hidden h-16 w-16 rounded-full border border-mcz-pink/40 object-cover shadow-neon sm:block"
        />
      </header>
      <SkillZPanel basePath="/api/mimez" accent="#ff2bd1" />
    </div>
  );
}
