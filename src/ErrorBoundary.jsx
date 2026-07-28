// Crash containment.
//
// React unmounts the whole tree when a render throws, so before this existed a
// single bad response in one app (say a list endpoint returning an object, and
// some `.map` blowing up) took the entire site to a blank page — no header, no
// dock, no message. A boundary around each app keeps the crash local: the shell
// survives and the member can just open something else.
import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for whoever is looking at DevTools.
    console.error("[MCZ] app crashed:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label || "This app";
    return (
      <div className="neon-frame space-y-3 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0 text-mcz-ember" />
          <h3 className="font-display text-lg font-extrabold">{label} hit a snag</h3>
        </div>
        <p className="text-sm text-white/60">
          Something in {label} failed to load, so it's been stopped here instead of
          taking the rest of Music ConnectZ down with it. Everything else still works.
        </p>
        <p className="break-words rounded-lg bg-black/40 px-3 py-2 font-mono text-[11px] text-white/40">
          {String(error?.message || error)}
        </p>
        <button className="re-btn !w-auto px-5" onClick={() => this.setState({ error: null })}>
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    );
  }
}
