import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "../api.js";
import { clearReturn, readReturn, stashReturn, takeReturn } from "./returnTo.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // The account this device can switch back to, if a member left one signed in
  // to go and confirm another (DupeZ). A username only — the tokens stay in
  // `returnTo.js` and are never held in React state.
  const [returnTo, setReturnTo] = useState(() => readReturn()?.username || null);

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
    const res = await api(`/api/auth/oauth/${provider}/`, {
      method: "POST",
      auth: false,
      body: payload,
    });
    // The server could not tell whether this is a new member or one signing in
    // a second way, so it asked instead of guessing. Nothing went wrong and
    // nobody is signed in yet: hand the question back un-persisted, because
    // `persist` would store an undefined token and set a user that isn't one.
    if (res?.needs_choice) return res;
    return persist(res);
  }

  function logout() {
    tokenStore.clear();
    // Out means out: a signed-out device must not still hold another account's
    // session for somebody else to switch to.
    clearReturn();
    setReturnTo(null);
    setUser(null);
  }

  // Leave THIS account signed in on the device and go and sign in to another,
  // so "switch back" is one tap afterwards. False when it cannot be kept (a
  // stash already exists, or storage refuses) — the caller says so and does
  // nothing, rather than signing the member out of the only account they have.
  function signInToOther(username) {
    if (!user) return false;
    const kept = stashReturn(user.username, {
      access: tokenStore.get(), refresh: tokenStore.getRefresh(),
    });
    if (!kept) return false;
    try { sessionStorage.setItem("mcz_login_as", username || ""); } catch { /* the hint is a nicety */ }
    tokenStore.clear();
    setReturnTo(user.username);
    setUser(null);
    return true;
  }

  // Back to the account that was left signed in. The kept session is used up
  // either way; if it has gone stale the member signs in again and is told so.
  async function switchBack() {
    const kept = takeReturn();
    setReturnTo(null);
    if (!kept) return false;
    tokenStore.clear();
    tokenStore.set(kept.access, kept.refresh);
    try {
      setUser(await api("/api/auth/me/"));
      return true;
    } catch {
      tokenStore.clear();
      setUser(null);
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, oauth, logout, returnTo, signInToOther, switchBack }}
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
