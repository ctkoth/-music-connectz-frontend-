// SoundCloudEngagementZ — Earn energy and spinaz for SoundCloud engagement.
//
// Your SoundCloud audience is your audience here too. Members report likes,
// reposts and comments on their tracks and earn rewards. Daily caps prevent
// gaming: 20 likes, 2 reposts, 5 comments per day.

import SoundCloudEngagement from "../SoundCloudEngagement.jsx";

export default function SoundCloudEngagementZ() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            🎵 SoundCloud Engagement
          </h1>
          <p className="mt-2 text-white/50">
            Your SoundCloud audience is your audience here too.
          </p>
        </div>

        <div className="grid gap-4">
          <SoundCloudEngagement />

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <h2 className="font-display text-sm font-semibold text-white/90">
              How it works
            </h2>

            <div className="space-y-2 text-sm text-white/70">
              <div>
                <p className="font-semibold text-white/90">👍 Likes</p>
                <p>Get <span className="text-emerald-300">1 ⚡ + 10 🍥</span> per like</p>
                <p className="text-xs text-white/40">Up to 20 per day</p>
              </div>

              <div>
                <p className="font-semibold text-white/90">🔁 Reposts</p>
                <p>Get <span className="text-emerald-300">3 ⚡ + 25 🍥</span> per repost</p>
                <p className="text-xs text-white/40">Up to 2 per day</p>
              </div>

              <div>
                <p className="font-semibold text-white/90">💬 Comments</p>
                <p>Get <span className="text-emerald-300">5 ⚡ + 50 🍥</span> per comment (min 10 chars)</p>
                <p className="text-xs text-white/40">Up to 5 per day</p>
              </div>
            </div>

            <div className="rounded bg-white/[0.03] p-3 text-xs text-white/40 space-y-1">
              <p>✓ One reward per track per kind per member</p>
              <p>✓ Rewards only on engagement you received</p>
              <p>✓ Can't rate your own track</p>
              <p>✓ Daily caps reset at midnight UTC</p>
            </div>
          </div>

          <div className="rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.04] p-4">
            <p className="text-sm text-mcz-cyan font-semibold mb-2">
              💡 Pro Tip
            </p>
            <p className="text-xs text-white/60">
              Engagement on your tracks here tells Music ConnectZ exactly what your audience
              loves. That feeds into recommendations for CollabZ, BattleZ, and every door
              your work can open in the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
