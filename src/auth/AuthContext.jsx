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

  async function register({ username, email, phone, password, birthday }) {
    const res = await api("/api/auth/register/", {
      method: "POST",
      auth: false,
      // birthday is optional but was previously dropped here, so ZodiacZ never
      // got set at signup — pass it through when present.
      body: { username, email, phone, password, birthday: birthday || null },
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
