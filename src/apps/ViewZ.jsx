import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Radio } from "lucide-react";
import { api } from "../api.js";
import { goToTab } from "../goto.js";
import { IconImg } from "../App.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import DawLanes, { dur } from "../components/DawLanes.jsx";

// ViewZ — how your things are being looked at, three ways:
//   Timeline — every viewer of your posts and profile as a track, every visit a clip.
//   My posts — one post at a time: the numbers, the history by day, and who.
//   My links — every share link you sent out and how often it was opened.
// Everything here is /api/economy/views/*; the screen only draws it. The numbers are
// yours at every tier; WHO viewed (names, and the tracks) is StatZ's, with the free
// sample for anybody who has not had one. A page that is open re-asks every
// POLL_MS, so it moves while you watch and the past is the same data, kept.

const POLL_MS = 15000;
const KIND = {
  post: "bg-mcz-cyan/70 border-mcz-cyan",
  profile: "bg-mcz-pink/70 border-mcz-pink",
  tab: "bg-mcz-gold/70 border-mcz-gold",
};
const KIND_LABEL = { post: "Post", profile: "Profile", tab: "App page" };
const DEV_ICON = { phone: "📱", tablet: "📲", desktop: "💻" };
const RANGES = [["1h", "1 hour"], ["24h", "24 hours"], ["7d", "7 days"]];
const TABS = [["timeline", "Timeline"], ["posts", "My posts"], ["links", "My links"]];

/** Ask for `path` now and every POLL_MS while the tab is visible. */
function useLive(path, deps = []) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    setBusy(true);
    return api(path).then((x) => { setD(x); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load."))
      .finally(() => setBusy(false));
  }, [path]);
  useEffect(() => {
    setD(null);
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load, ...deps]);  // eslint-disable-line react-hooks/exhaustive-deps
  return { d, err, busy };
}

const Pill = ({ children, title }) => <span className="pill" title={title}>{children}</span>;
const pctText = (v) => (v == null ? "—" : `${v}%`);

function Timeline() {
  const navigate = useNavigate();
  const { s: trial } = useStatzTrial();
  const [range, setRange] = useState("24h");
  const [scope, setScope] = useState("mine");
  const [d, setD] = useState(null);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true); setErr("");
    api(`/api/economy/views/timeline/?range=${range}&scope=${scope}`)
      .then((x) => { setD(x); setLocked(false); })
      .catch((e) => { if (e.status === 403 || /StatZ/.test(e.message)) setLocked(true); else setErr(e.message); })
      .finally(() => setBusy(false));
  }, [range, scope, trial?.active]);

  function openClip(c) {
    const [kind, key] = c.target.split(":");
    if (kind === "post") navigate(`/p/${key}`);
    else if (kind === "profile") window.dispatchEvent(new CustomEvent("mcz-goto-profile", { detail: key }));
    else goToTab(key);
  }
  const lanes = useMemo(() => (d?.lanes || []).map((l) => ({
    key: l.viewer,
    label: l.member ? `@${l.viewer}` : l.viewer,
    disabled: !l.member,
    title: l.member ? `Open @${l.viewer}` : [l.dev, l.src && `via ${l.src}`].filter(Boolean).join(" · ") || "No account",
    onLane: () => window.dispatchEvent(new CustomEvent("mcz-goto-profile", { detail: l.viewer })),
    sub: `${!l.member ? `${DEV_ICON[l.dev] || "👤"} ` : ""}${dur(l.seconds)}${!l.member && l.src ? ` · via ${l.src}` : ""}`,
    clips: l.clips.map((c) => ({ ...c, kind: c.target.split(":")[0], onClip: () => openClip(c),
      title: `${KIND_LABEL[c.target.split(":")[0]] || "App page"}: ${c.label} — ${dur(c.seconds)} at ${new Date(c.start).toLocaleString()}` })),
  })), [d]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (locked) {
    return (
      <div className="neon-frame space-y-2 p-4">
        <StatzSample what="The ViewZ timeline" />
        <p className="text-xs text-white/45">Everyone can see the total views under each post and profile, and the numbers for their own posts under My posts.</p>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)}
            className={`rounded-full border px-3 py-1 text-sm ${range === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{l}</button>
        ))}
        {d?.can_scope_all && (
          <button onClick={() => setScope(scope === "all" ? "mine" : "all")}
            className={`ml-auto rounded-full border px-3 py-1 text-sm ${scope === "all" ? "border-mcz-gold bg-mcz-gold/15" : "border-white/15 text-white/60"}`}>
            {scope === "all" ? "Everything (owner)" : "Mine"}
          </button>
        )}
        {busy && <Loader2 className="animate-spin text-white/40" size={16} />}
      </div>
      {d && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Pill><Eye size={13} className="mr-1 inline" />{d.total_views} views</Pill>
          <Pill>{dur(d.total_seconds)} watched</Pill>
          <Pill>{d.members ?? 0} {d.members === 1 ? "member" : "members"}</Pill>
          <Pill title="People without an account, one track per browser — never named.">
            {d.visitors ?? 0} {d.visitors === 1 ? "visitor" : "visitors"}
          </Pill>
        </div>
      )}
      {d && (d.lanes.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Nobody's viewed your posts or profile in this window yet. Share a post from{" "}
          <button className="re-link" onClick={() => goToTab("postz")}>PostZ</button> to fill the tracks.
        </p>
      ) : (
        <DawLanes lanes={lanes} from={Date.parse(d.from)} to={Date.parse(d.to)} kinds={KIND} minWidth={range === "7d" ? 700 : 520} />
      ))}
      <div className="flex flex-wrap gap-3 text-[11px] text-white/50">
        {Object.entries(KIND).map(([k, cls]) => (
          <span key={k} className="inline-flex items-center gap-1"><span className={`inline-block h-2.5 w-4 rounded border ${cls}`} /> {KIND_LABEL[k]}</span>
        ))}
      </div>
      {d?.notice && <p className="text-[11px] text-white/40">{d.notice}</p>}
      {err && <p className="text-sm text-mcz-ember">{err}</p>}
    </>
  );
}

function Numbers({ d }) {
  const a = d.actions || {};
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-sm">
        <Pill title={d.definitions?.views}><Eye size={13} className="mr-1 inline" />{d.views} views</Pill>
        <Pill title="Different people — members and visitors.">{d.people} people</Pill>
        <Pill>{d.members} {d.members === 1 ? "member" : "members"} · {d.visitors} {d.visitors === 1 ? "visitor" : "visitors"}</Pill>
        <Pill title={d.definitions?.stayed}>stayed {pctText(d.stayed_pct)}</Pill>
        <Pill title={d.definitions?.came_back}>came back {pctText(d.came_back_pct)}</Pill>
        <Pill>{d.avg_seconds == null ? "avg —" : `avg ${dur(d.avg_seconds)}`}</Pill>
        {d.live_now > 0 && <Pill><Radio size={12} className="mr-1 inline text-emerald-300" />{d.live_now} here now</Pill>}
      </div>
      {a && (
        <p className="text-[12px] text-white/60" title={d.definitions?.actions}>
          Of the people who visited: ⭐ {a.rated} rated · 💬 {a.commented} commented · 👍 {a.liked} liked · ✉️ {a.messaged} messaged you
          {a.acted != null && <> — {a.acted} acted in some way</>}
        </p>
      )}
      <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-white/40">
        <li><b>Views</b> — {d.definitions?.views}</li>
        <li><b>Stayed</b> — {d.definitions?.stayed}</li>
        <li><b>Came back</b> — {d.definitions?.came_back}</li>
      </ul>
    </div>
  );
}

function History({ days }) {
  const max = Math.max(1, ...days.map((x) => x.views));
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">Views by day</p>
      <div className="flex h-16 items-end gap-1">
        {days.map((x) => (
          <div key={x.day} className="flex flex-1 flex-col items-center justify-end" title={`${new Date(`${x.day}T12:00`).toLocaleDateString()} — ${x.views} views (${x.members} members, ${x.visitors} visitors)`}>
            <div className="w-full rounded-t bg-mcz-cyan/60" style={{ height: `${(x.views / max) * 100}%`, minHeight: x.views ? 3 : 1, opacity: x.views ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-white/35">
        <span>{new Date(`${days[0].day}T12:00`).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
        <span>today</span>
      </div>
    </div>
  );
}

function PostDetail({ id, onBack }) {
  const { d, err, busy } = useLive(`/api/economy/views/post/${id}/`, [id]);
  const lanes = useMemo(() => (d?.viewers || []).map((v) => ({
    key: v.viewer,
    label: v.member ? `@${v.viewer}` : v.viewer,
    disabled: !v.member,
    onLane: () => window.dispatchEvent(new CustomEvent("mcz-goto-profile", { detail: v.viewer })),
    sub: [dur(v.seconds), v.rated != null && `⭐${v.rated}`, v.commented > 0 && `💬${v.commented}`,
      v.messaged > 0 && `✉️${v.messaged}`, v.liked && "👍"].filter(Boolean).join(" "),
    title: [v.member ? `@${v.viewer}` : v.viewer, v.dev, v.src && `via ${v.src}`, v.came_back && "came back"].filter(Boolean).join(" · "),
    clips: v.clips.map((c) => ({ ...c, kind: "post", label: dur(c.seconds) })),
  })), [d]);
  return (
    <div className="space-y-3">
      <button className="re-link text-sm" onClick={onBack}>← All my posts</button>
      {!d ? (err ? <p className="text-sm text-mcz-ember">{err}</p> : <Loader2 className="animate-spin text-white/40" />) : (
        <>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold">{d.post.title || `Post #${d.post.id}`}</h3>
            {busy && <Loader2 className="animate-spin text-white/30" size={14} />}
            <button className="re-link ml-auto text-xs" onClick={() => window.location.assign(`/p/${d.post.id}`)}>Open post</button>
          </div>
          <Numbers d={d} />
          <History days={d.by_day} />
          <div className="space-y-1.5" data-tour="viewz-tracks">
            <p className="text-[11px] uppercase tracking-wide text-white/40">Every viewer, every visit — time, date and length</p>
            {d.viewers == null ? (
              <div className="neon-frame space-y-2 p-4">
                <StatzSample what="Who viewed your post, as tracks" />
                <p className="text-xs text-white/45">{d.viewers_locked}</p>
              </div>
            ) : d.viewers.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/60">Nobody has viewed this post yet.</p>
            ) : (
              <DawLanes lanes={lanes} from={Date.parse(d.from)} to={Date.parse(d.to)} kinds={{ post: KIND.post }} />
            )}
          </div>
          <p className="text-[11px] text-white/40">{d.notice} Updates every {POLL_MS / 1000} seconds while this is open.</p>
        </>
      )}
    </div>
  );
}

function MyPosts({ open, setOpen }) {
  const { d, err } = useLive(open ? "" : "/api/economy/views/mine/", [open]);
  if (open) return <PostDetail id={open} onBack={() => setOpen(null)} />;
  if (!d) return err ? <p className="text-sm text-mcz-ember">{err}</p> : <Loader2 className="animate-spin text-white/40" />;
  if (!d.posts.length) return <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">You haven't posted yet. <button className="re-link" onClick={() => goToTab("postz")}>Post in PostZ</button> and its results land here.</p>;
  return (
    <ul className="space-y-1.5">
      {d.posts.map((p) => (
        <li key={p.id}>
          <button onClick={() => setOpen(p.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/5 px-3 py-2 text-left text-[13px] hover:bg-white/10">
            <span className="min-w-0 flex-1 truncate font-semibold">{p.title || `Post #${p.id}`}</span>
            <span><Eye size={12} className="mr-1 inline" />{p.views}</span>
            <span className="text-white/55">{p.members}m · {p.visitors}v</span>
            <span className="text-white/55" title={d.definitions?.stayed}>stayed {pctText(p.stayed_pct)}</span>
            <span className="text-white/55" title={d.definitions?.came_back}>back {pctText(p.came_back_pct)}</span>
            {p.live_now > 0 && <span className="text-emerald-300"><Radio size={11} className="mr-1 inline" />{p.live_now} now</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function MyLinks() {
  const { d, err } = useLive("/api/economy/views/mine/");
  if (!d) return err ? <p className="text-sm text-mcz-ember">{err}</p> : <Loader2 className="animate-spin text-white/40" />;
  const KIND_W = { take: "Score card", win: "Improvement card", recap: "Monthly recap" };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Pill><Eye size={13} className="mr-1 inline" />{d.links_opens} opens across {d.links.length} {d.links.length === 1 ? "link" : "links"}</Pill>
        <Pill title="Everybody who joined from any of your invites — not split by link, because an invite carries your handle, not the card it came from.">
          {d.joined_from_invites} joined from your invites
        </Pill>
      </div>
      {!d.links.length ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">No share links yet. Open any past take and press <b>Share this score</b> or <b>Write a promo post</b> — its results come here.</p>
      ) : (
        <ul className="space-y-1.5">
          {d.links.map((l) => (
            <li key={l.token} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/5 px-3 py-2 text-[13px]">
              <span className="font-semibold">{KIND_W[l.kind] || "Card"}</span>
              <span className="text-white/55">{l.app_key} · {l.score}/10{l.genre ? ` · ${l.genre}` : ""}</span>
              <span className="text-white/40">{new Date(l.at).toLocaleDateString()}</span>
              {l.human && <span className="text-emerald-300/80">human-made, declared</span>}
              <span className="ml-auto"><Eye size={12} className="mr-1 inline" />{l.opens} {l.opens === 1 ? "open" : "opens"}</span>
              <a href={l.url} target="_blank" rel="noreferrer" className="text-mcz-cyan underline">See the card</a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-white/40">An open is someone loading the card's page — a crawler fetching the preview image is not one. Who opened a link isn't recorded, so none is claimed. Updates every {POLL_MS / 1000} seconds.</p>
    </div>
  );
}

export default function ViewZ() {
  const [tab, setTab] = useState("timeline");
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="viewz.png" alt="ViewZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">ViewZ</h2>
          <p className="text-sm text-white/60">How your posts, profile and share links are being looked at — live, and over time.</p>
        </div>
      </header>
      <div className="flex gap-2" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpen(null); }}
            className={`rounded-full border px-3 py-1 text-sm ${tab === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{l}</button>
        ))}
      </div>
      {tab === "timeline" && <Timeline />}
      {tab === "posts" && <MyPosts open={open} setOpen={setOpen} />}
      {tab === "links" && <MyLinks />}
    </div>
  );
}
