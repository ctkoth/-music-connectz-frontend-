import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api("/api/auth/me/");
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function persist(res) {
    tokenStore.set(res.access, res.refresh);
    setUser(res.user);
    return res.user;
  }

  async function register({ username, email, phone, password, birthday, ref, trial_token, trial_split }) {
    const res = await api("/api/auth/register/", {
      method: "POST",
      auth: false,
      // birthday is optional but was previously dropped here, so ZodiacZ never
      // got set at signup. `ref` credits the inviter 300 SpinaZ on a legit join.
      // trial_token was dropped here too — every /try → register conversion
      // silently lost the take it promised to save, since the backend claims
      // it only when this field is sent. trial_split is the same trap: a
      // caller can pass it and it would vanish right here if this function
      // kept building its own body from a shorter field list.
      body: {
        username,
        email,
        phone,
        password,
        birthday: birthday || null,
        ref: ref || "",
        trial_token: trial_token || "",
        trial_split: trial_split || [],
      },
    });
    return persist(res);
  }

  async function login({ identifier, password }) {
    const res = await api("/api/auth/login/", {
      method: "POST",
      auth: false,
      body: { identifier, password },
    });
    return persist(res);
  }

  async function oauth(provider, payload) {
    // A take scored at /try before there was an account. `register()` has
    // always sent it; `oauth()` never did, so somebody who scored and then
    // joined with Google, Spotify or SoundCloud lost the take the trial page
    // had just promised to save — and those are the one-tap doors most phone
    // visitors would actually use. Read straight from storage rather than
    // importing TrialTake, which would drag a route component into the auth
    // context. An older server ignores the field it does not know.
    let trial_token = "";
    try { trial_token = localStorage.getItem("mcz_trial_token") || ""; } catch { /* private mode */ }
    const res = await api(`/api/auth/oauth/${provider}/`, {
      method: "POST",
      auth: false,
      body: trial_token ? { ...payload, trial_token } : payload,
    });
    // The server could not tell whether this is a new member or one signing in
    // a second way, so it asked instead of guessing. Nothing went wrong and
    // nobody is signed in yet: hand the question back un-persisted, because
    // `persist` would store an undefined token and set a user that isn't one.
    if (res?.needs_choice) return res;
    // The take is attached now (or the server declined it); either way it is
    // not to be offered to the next sign-in on this browser.
    if (trial_token) { try { localStorage.removeItem("mcz_trial_token"); } catch { /* private mode */ } }
    return persist(res);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, oauth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
