// Bridge from the /v2 app to the backend economy endpoints. Each call throws
// on failure (no auth / backend down); callers catch and fall back to local
// state so the app still works offline / pre-deploy.
import { api, tokenStore } from "../api.js";

export const isSignedIn = () => !!tokenStore.get();

// { wallet: { money_cents, money, energy, spinaz }, transactions: [...] }
export const getWallet = () => api("/api/economy/wallet/");

// Server enforces the developer tax; returns { wallet, breakdown }.
export const addFundsApi = (amountCents, note = "Add funds") =>
  api("/api/economy/wallet/add/", { method: "POST", body: { amount_cents: amountCents, note } });

// { tier, dev_tax_rate }
export const setTierApi = (tier) =>
  api("/api/economy/membership/", { method: "POST", body: { tier } });
