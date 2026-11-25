import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { api } from "../api.js";
import { locationError } from "../location.js";

// Share an approximate location — off by default, and the whole deal said BEFORE the button.
//
// The server has had `share_location`, `lat` and `lng` on the profile since the range gates
// shipped (VenueZ, CollabZ, BattleZ, lessons and member search all read them for distance), and
// nothing mounted could turn it on — the same built-and-invisible shape as the portfolio editor.
//
// It decides nothing: the position is rounded and stored by the server, adults only is the
// server's wall, and the sentence it refuses with is shown unreworded. The screen says what
// the member is giving, who sees it, and what turning it off does, before it is pressed.
export default function LocationShare({ initial = false }) {
  const [on, setOn] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function save(body, done) {
    return api("/api/economy/profile/location/", { method: "POST", body })
      .then((r) => { setOn(!!r.share_location); setMsg(done); })
      .catch((e) => setMsg(e.message || "That didn't save — nothing changed."))
      .finally(() => setBusy(false));
  }

  function turnOn() {
    setMsg("");
    if (!navigator.geolocation) return setMsg(locationError(null));
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => save({ share: true, lat: pos.coords.latitude, lng: pos.coords.longitude },
                    "Sharing — rooms and people near you now show up in distance filters."),
      (err) => { setBusy(false); setMsg(locationError(err)); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }

  function turnOff() {
    setBusy(true); setMsg("");
    save({ share: false }, "Stopped, and the stored position is deleted.");
  }

  return (
    <div className="space-y-2" data-tour="location-share">
      <span className="re-label flex items-center gap-2"><MapPin size={14} className="text-mcz-cyan" /> Share my approximate location</span>
      <p className="text-xs leading-relaxed text-white/60">
        <span className="text-emerald-300">Costs nothing.</span> Gain: VenueZ, CollabZ, BattleZ and member
        search can filter by distance to you. Others only ever see a distance, never a point on a map, and
        your position is stored rounded to about 1 km. Members 18 and over only. Off until you turn it on.
        Turning it off deletes the stored position.
      </p>
      <button
        className="neon-btn !w-auto px-4 py-2 text-sm disabled:opacity-50"
        disabled={busy}
        onClick={on ? turnOff : turnOn}
      >
        {busy ? <Loader2 className="animate-spin" size={14} /> : on ? "Stop sharing and delete it" : "Share my location"}
      </button>
      <p className="text-[11px] text-white/45">{on ? "You are sharing an approximate location." : "You are not sharing a location."}</p>
      {msg && <p className="text-[11px] text-mcz-cyan">{msg}</p>}
    </div>
  );
}
