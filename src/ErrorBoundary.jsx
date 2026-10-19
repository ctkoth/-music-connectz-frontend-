// Crash containment.
//
// React unmounts the whole tree when a render throws, so before this existed a
// single bad response in one app (say a list endpoint returning an object, and
// some `.map` blowing up) took the entire site to a blank page — no header, no
// dock, no message. A boundary around each app keeps the crash local: the shell
// survives and the member can just open something else.
//
// Two DIFFERENT failures land here, and telling somebody the wrong one sends
// them to report a bug in an app that has nothing wrong with it:
//
//   * A real crash in that app's code or data. "SingZ hit a snag" is true, and
//     re-rendering is a fair retry — the next response may parse.
//   * A chunk that is not on the server any more, because a deploy happened
//     while this tab was open (see `chunkError.js`). Nothing is wrong with
//     SingZ; the PAGE is out of date. And re-rendering cannot possibly fix it:
//     React caches the rejected `lazy()` promise, so "Try again" re-throws the
//     identical error instantly, forever. That button was a dead end for the
//     one failure a member is most likely to hit.
import { Component } from "react";
import { AlertTriangle, RotateCcw, Download, WifiOff } from "lucide-react";

import { isChunkError, isOffline, reloadForNewVersion } from "./chunkError.js";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for whoever is looking at DevTools.
    console.error("[MCZ] app crashed:", error, info?.componentStack);
    // Backstop for a stale chunk that reached render without `lazyRoute`
    // having caught it. Refuses to act when offline or when it has already
    // reloaded recently, so this can never become a loop.
    if (isChunkError(error)) reloadForNewVersion();
  }

  retry = () => {
    // For a stale chunk the only thing that helps is fetching the page again.
    // Clearing the error would re-render the same cached rejection.
    if (isChunkError(this.state.error)) window.location.reload();
    else this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label || "This app";
    const stale = isChunkError(error);
    const offline = stale && isOffline();

    const title = offline ? "You're offline"
      : stale ? "A new version shipped"
      : `${label} hit a snag`;

    const body = offline
      ? `${label} needs one more file and the connection dropped before it arrived. Nothing is lost — reconnect and press the button.`
      : stale
        ? `Music ConnectZ updated while this tab was open, so the piece ${label} needed had already been replaced. Reloading picks up the new one. Nothing is wrong with ${label}.`
        : `Something in ${label} failed to load, so it's been stopped here instead of taking the rest of Music ConnectZ down with it. Everything else still works.`;

    const Icon = offline ? WifiOff : stale ? Download : AlertTriangle;

    return (
      <div className="neon-frame space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Icon size={18} className="shrink-0 text-mcz-ember" />
          <h3 className="font-display text-lg font-extrabold">{title}</h3>
        </div>
        <p className="text-sm text-white/60">{body}</p>
        {/* The raw message stays for a real crash, where it is the useful part.
            On a stale chunk it is a filename nobody can act on, and printing it
            makes an ordinary update look like a fault. */}
        {!stale && (
          <p className="break-words rounded-lg bg-black/40 px-3 py-2 font-mono text-[11px] text-white/40">
            {String(error?.message || error)}
          </p>
        )}
        <button className="re-btn !w-auto px-5" onClick={this.retry}>
          <RotateCcw size={15} /> {stale ? "Reload" : "Try again"}
        </button>
      </div>
    );
  }
}
