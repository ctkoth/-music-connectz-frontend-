import SkillZPanel from "../skillz/SkillZPanel.jsx";

export default function DirectZ() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <img src="/icons/directz.png" alt="DirectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan drop-shadow-[0_0_12px_rgba(34,230,255,0.5)]">
            DirectZ
          </h2>
          <p className="text-sm text-white/60">
            Dynamic Scene Creation · Audio-Visual Harmony · Creative Collaborations.
          </p>
          <span className="pill mt-1 inline-block">Age-gated</span>
        </div>
        <img
          src="/icons/personaz_director.webp"
          alt="Director PersonaZ"
          className="hidden h-16 w-16 rounded-full border border-mcz-cyan/40 object-cover shadow-neon sm:block"
        />
      </header>
      <SkillZPanel basePath="/api/directz" accent="#22e6ff" />
    </div>
  );
}
