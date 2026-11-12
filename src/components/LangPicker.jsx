// The display-language picker: a flag in the header, every language the server
// offers behind it. The list, the flags and the note are `/api/economy/uitext/`;
// nothing about them is typed here. Choosing one is free and says what it is
// (machine translation of the app's own screens) before it is chosen.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { currentLang, onLangChange, setUiLang } from "../autoTranslate.js";
import { langMatches } from "../uiLang.js";

export default function LangPicker({ corner = false }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(currentLang);
  const [list, setList] = useState(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => onLangChange(setLang), []);
  useEffect(() => {
    if (!open || list) return;
    api("/api/economy/uitext/", { auth: false })
      .then((d) => { setList(Array.isArray(d?.languages) ? d.languages : []); setNote(d?.note || ""); })
      .catch(() => setFailed(true));
  }, [open, list]);
  const pick = (l) => { setUiLang(l.code === "en" ? null : l); setOpen(false); setQ(""); };
  return (
    <div className={corner ? "fixed bottom-3 left-3 z-50" : "relative"} data-notranslate="true">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
              aria-label={`Display language: ${lang ? lang.own : "English"}`} title="Display language"
              className={`rounded-lg p-1.5 text-base leading-none hover:bg-white/10 ${corner ? "border border-white/15 bg-black/70" : ""}`}>
        <span aria-hidden="true">{lang ? lang.flag : "🌐"}</span>
      </button>
      {open && (
        <div className={`absolute z-[60] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/15 bg-mcz-bg p-2 shadow-2xl ${corner ? "bottom-10 left-0" : "right-0 top-10"}`}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search languages"
                 aria-label="Search languages" className="neon-input mb-2 !py-1.5 text-sm" />
          {note && <p className="mb-2 px-1 text-[11px] text-white/50"><span className="text-emerald-300">Free.</span> {note}</p>}
          {failed && <p className="px-1 text-xs text-mcz-ember">Couldn't load the languages. Try again in a moment.</p>}
          <ul role="listbox" aria-label="Display language" className="max-h-72 overflow-y-auto">
            {(list || []).filter((l) => langMatches(l, q)).map((l) => {
              const on = (lang ? lang.code : "en") === l.code;
              return (
                <li key={l.code}>
                  <button type="button" role="option" aria-selected={on} onClick={() => pick(l)} dir="auto"
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${on ? "bg-mcz-cyan/20 text-white" : "text-white/80 hover:bg-white/10"}`}>
                    <span aria-hidden="true">{l.flag}</span>
                    <span className="min-w-0 flex-1 truncate">{l.own}</span>
                    <span className="shrink-0 text-[11px] text-white/40">{l.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
