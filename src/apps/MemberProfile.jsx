// A member's public profile, shown as a modal.
//
// Opened by tapping someone in the online list on the CommunityBar. Reads the
// same payload Social ConnectZ uses, so whatever a member fills in on ProfileZ
// shows up here.
import { useViewTracker } from "../viewz.js";
import ViewCount from "../components/ViewCount.jsx";
import { playSound } from "../sound.js";
import { useEffect, useState } from "react";
import { Loader2, MapPin, Star, Users, X, Edit, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import CopyLink from "../CopyLink.jsx";
import { personaName } from "./socialData.js";
import { BadgeWear, BadgeWearList } from "../BadgeWear.jsx";
import MentionText from "../MentionParser.jsx";
import { SignLink } from "../components/Horoscope.jsx";
import { LinkList } from "../WidgetBoard.jsx";

function Pill({ children, className = "" }) {
  return <span className={`pill ${className}`}>{children}</span>;
}


// Follow / unfollow. The relationship and the counts are the server's — a
// follow the server refused (a block, say) never shows as done.
function FollowButton({ username, onCounts }) {
  const [rel, setRel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/api/economy/follow/?username=${encodeURIComponent(username)}`)
      .then((d) => setRel(d.relationship)).catch(() => {});
  }, [username]);
  if (!rel || rel.label === "self") return null;
  async function toggle() {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/economy/follow/", { method: "POST",
        body: { username, action: rel.is_following ? "unfollow" : "follow" } });
      setRel(d.relationship);
      onCounts?.({ followers: d.followers, following: d.following });
      if (d.relationship.is_following) playSound("follow");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const label = rel.label === "friends" ? "🤝 Friends" : rel.is_following ? "Following"
    : rel.follows_me ? "Follow back" : "Follow";
  return (
    <div className="flex items-center gap-2">
      <button className={rel.is_following ? "re-btn !w-auto px-4 py-1.5 text-sm" : "neon-btn-primary !w-auto px-4 py-1.5 text-sm"}
        disabled={busy} onClick={toggle} title={rel.is_following ? "Tap to unfollow" : ""}>
        {label}
      </button>
      {err && <span className="text-xs text-mcz-ember">{err}</span>}
    </div>
  );
}

export default function MemberProfile({ username, onClose, currentUsername, onEditProfile, isOwner, onEditMember, onDeleteMember }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useViewTracker(username && username !== currentUsername ? `profile:${username}` : null);

  useEffect(() => {
    let on = true;
    setData(null);
    setError("");
    api(`/api/economy/members/${encodeURIComponent(username)}/`)
      .then((d) => {
        if (!on) return;
        // If viewing your own profile, navigate to edit instead
        if (currentUsername && username === currentUsername && onEditProfile) {
          onEditProfile();
        } else {
          setData(d);
        }
      })
      .catch((e) => on && setError(e.message));
    return () => { on = false; };
  }, [username, currentUsername, onEditProfile]);

  // Escape closes, matching every other modal in the app.
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="neon-frame max-h-[85vh] w-full max-w-md overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {data?.avatar ? (
              <img src={data.avatar} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-neon" />
            ) : (
              <IconImg icon="personaz.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-neon" />
            )}
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-extrabold">
                {data?.display_name || username}
              </h3>
              {/* The handle and the way to hand it to somebody, together.
                  A profile is a pitch, and a pitch you cannot send is a page. */}
              <p className="flex items-center gap-1 text-xs text-white/45">
                <span className="truncate">@{username}</span>
                <CopyLink username={username} label="" />
              </p>
              {/* The title and the medals sit with the name, because that is
                  what a title is for — it qualifies the person, not the page. */}
              <BadgeWear badges={data?.badges} title={data?.badge_title}
                         size="h-6 w-6" className="pt-1" />
            </div>
          </div>
          <div className="flex gap-1">
            {isOwner && username !== currentUsername && (
              <>
                <button
                  onClick={() => onEditMember && onEditMember(username)}
                  className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
                  title="Edit account"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => onDeleteMember && onDeleteMember(username)}
                  className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-mcz-ember/20 hover:text-mcz-ember"
                  title="Delete account"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!data && !error && (
          <p className="flex items-center gap-2 py-6 text-white/50">
            <Loader2 className="animate-spin" size={16} /> Loading profile…
          </p>
        )}
        {error && <p className="py-4 text-sm text-mcz-pink">{error}</p>}

        {data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {data.tier && <Pill className="uppercase !text-mcz-cyan">{data.tier}</Pill>}
              {data.sign && <SignLink sign={data.sign} />}
              {data.age != null && <Pill>{data.age}</Pill>}
              {data.gender && <Pill>{data.gender}</Pill>}
              {data.founding && <Pill className="!text-mcz-gold">Founding</Pill>}
              {data.verified_18plus && <Pill className="!text-emerald-300">18+ verified</Pill>}
            </div>

            {data.location && (
              <p className="flex items-center gap-1.5 text-sm text-white/60">
                <MapPin size={14} className="text-mcz-cyan" /> {data.location}
              </p>
            )}

            {data.bio && <p className="text-sm leading-relaxed text-white/75"><MentionText text={data.bio} /></p>}

            {/* Spelled out, not just worn. "Ten deals, no dispute" is the
                reason to work with somebody, and it should not need a hover. */}
            <BadgeWearList badges={data.badges} />
            <ViewCount target={`profile:${username}`} />

            <FollowButton username={username} onCounts={(c) => setData((d) => ({ ...d, ...c }))} />

            <div className="flex flex-wrap gap-2 text-xs">
              <Pill><Users size={11} className="inline" /> {data.followers ?? 0} followers</Pill>
              <Pill>{data.following ?? 0} following</Pill>
              {data.overall != null && (
                <Pill className="!text-mcz-gold"><Star size={11} className="inline" /> {data.overall} overall</Pill>
              )}
            </div>

            {data.personas?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">PersonaZ</p>
                <div className="flex flex-wrap gap-1.5">
                  {/* A persona is {key, name, skills} since the skill picker
                      landed. Rendering it raw put an object where React wants
                      a child and took every member profile down. */}
                  {data.personas.map((p, i) => (
                    <Pill key={(p && p.key) || personaName(p) || i}>{personaName(p)}</Pill>
                  ))}
                </div>
              </div>
            )}

            {data.nationalities?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">NationalitieZ</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.nationalities.map((n) => <Pill key={n}>{n}</Pill>)}
                </div>
              </div>
            )}

            {/* Links open ON this screen — a player, one of our own screens,
                or (StatZ, scan-cleared) the page itself — instead of handing
                the member to a tab and losing everything else they had open.
                LinkList is also where the +5 ⚡ a genuine visit pays gets
                stated, before the link is pressed rather than after. */}
            {data.links?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">Links</p>
                <LinkList links={data.links} owner={data.mine ? "" : username} />
              </div>
            )}

            {data.mine && (
              <p className="text-[11px] text-white/35">This is you — edit any of it in ProfileZ.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
