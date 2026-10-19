import { useState, useEffect } from "react";
import { Loader2, Save, X, Edit2 } from "lucide-react";
import { api } from "../api.js";
import { SPINAZ } from "../resources.js";

/**
 * WhatINeedCard — a card that shows what kind of collaborators/promoters you need.
 * Displayed on your profile so the right people know they're a match.
 */
export default function WhatINeed() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ active: false, help_needed: "", status: "", current_reach: "", rate: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/economy/profile/").then((d) => {
      const seeking = d?.seeking || {};
      setData(seeking);
      if (seeking.active) {
        setForm(seeking);
      }
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/economy/profile/", {
        method: "POST",
        body: { seeking: form },
      });
      setData(form);
      setEditing(false);
      setMsg("Saved. Your seeking card is now live.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(e.message || "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setForm(data || { active: false, help_needed: "", status: "", current_reach: "", rate: "" });
    setEditing(false);
    setMsg("");
  }

  if (!data && !editing) {
    return null;
  }

  const isActive = form.active;

  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        <span>🎯 What I Need</span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="re-btn !w-auto px-2 py-1 !text-xs"
            title="Edit what you're seeking"
          >
            <Edit2 size={12} /> Edit
          </button>
        )}
      </p>

      {!editing ? (
        // Display mode
        isActive ? (
          <div className="space-y-2 text-sm">
            {form.help_needed && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Need</p>
                <p className="text-white">{form.help_needed}</p>
              </div>
            )}
            {form.status && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Status</p>
                <p className="text-white/80">{form.status}</p>
              </div>
            )}
            {form.current_reach && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Currently</p>
                <p className="text-white/80">{form.current_reach}</p>
              </div>
            )}
            {form.rate && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Rate</p>
                <p className="text-mcz-gold">{form.rate}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/40">No public seeking info yet.</p>
        )
      ) : (
        // Edit mode
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border border-white/20 bg-black/30 accent-mcz-gold"
            />
            <span>Show this on my profile</span>
          </label>

          {form.active && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">What kind of help do you need?</label>
                <input
                  type="text"
                  placeholder="e.g. Lo-fi producer / beat supplier"
                  value={form.help_needed}
                  onChange={(e) => setForm({ ...form, help_needed: e.target.value })}
                  maxLength={60}
                  className="neon-input text-sm"
                />
                <p className="mt-1 text-[9px] text-white/30">{form.help_needed.length}/60</p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">What are you building?</label>
                <input
                  type="text"
                  placeholder="e.g. 10-track album, zero beats yet"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  maxLength={100}
                  className="neon-input text-sm"
                />
                <p className="mt-1 text-[9px] text-white/30">{form.status.length}/100</p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">Where are you now?</label>
                <input
                  type="text"
                  placeholder="e.g. 1.2k SoundCloud followers, no YouTube"
                  value={form.current_reach}
                  onChange={(e) => setForm({ ...form, current_reach: e.target.value })}
                  maxLength={100}
                  className="neon-input text-sm"
                />
                <p className="mt-1 text-[9px] text-white/30">{form.current_reach.length}/100</p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">What's your rate?</label>
                <input
                  type="text"
                  placeholder="e.g. Revenue split or $50/beat, your choice"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  maxLength={80}
                  className="neon-input text-sm"
                />
                <p className="mt-1 text-[9px] text-white/30">{form.rate.length}/80</p>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              className="neon-btn-primary !py-2 !text-sm flex-1 disabled:opacity-50"
              onClick={save}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin inline mr-1" size={14} /> : <Save size={14} className="inline mr-1" />}
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              className="re-btn !py-2 !text-sm px-4"
              onClick={cancel}
              disabled={busy}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-[11px] text-mcz-gold">{msg}</p>}
    </div>
  );
}
