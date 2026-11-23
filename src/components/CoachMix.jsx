// "Get the coach's rating" for a finished mix. The mix is scored by ProduceZ, the producer's coach (groove, sounds, arrangement,
// melody & harmony, mix), which listens to it and rates each. This is the AI coach's rating, never a rating of your own post.
// The price is on the button before it is pressed (the same line the coach screen shows: components/CoachCost.jsx), and the run
// itself happens in ProduceZ, where Send repeats the price: the file is already saved, so nothing is uploaded again, and a mix the
// coach can't read is not charged. It decides nothing: the price, the dimensions and the score are the server's.
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";
import AiEnergy from "./AiEnergy.jsx";
import { Cost } from "./CoachCost.jsx";

const APP = "producez";

export default function CoachMix({ url, uploadId, title = "" }) {
  const [price, setPrice] = useState(null);
  useEffect(() => { let on = true; api(`/api/${APP}/coach/`).then((d) => on && setPrice(d)).catch(() => {}); return () => { on = false; }; }, []);
  const engine = price?.think?.configured ? price?.think?.engine?.key || null : null;
  const go = () => handOff(APP, "", { kind: "upload", upload_id: uploadId, title, coach_kind: "audio", audio_url: url });
  return (
    <div className="space-y-1.5 rounded-xl border border-mcz-cyan/25 bg-mcz-cyan/[0.04] p-3" data-tour="daw-coach-mix">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="neon-btn-primary !w-auto px-3" onClick={go} disabled={!uploadId}>
          <Target size={13} /> Get the coach's rating
        </button>
        <Cost price={price} />{price && <AiEnergy engine={engine} className="text-[11px]" />}
      </div>
      <p className="text-[11px] text-white/60">
        {price?.scores ? "Scored on " + Object.values(price.scores).join(", ") + ". " : ""}
        The AI producer's coach listens to this mix and rates it. It opens in ProduceZ with the file already loaded; press Send there to run it.
        Nothing uploads again, and a mix the coach can't read isn't charged.
      </p>
    </div>
  );
}
