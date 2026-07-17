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

// { char_limit, upload_mb, storage_mb, storage_used_mb, tier, dev_tax_rate }
export const getLimitsApi = () => api("/api/economy/limits/");

// { items: [{ id, name, price_cents, owned }] }
export const getSpecZApi = () => api("/api/economy/specz/");

// StatZ-only. Server records the dev tax on the sale; 402/403/409 on failure.
export const buySpecZApi = (itemId) =>
  api("/api/economy/specz/buy/", { method: "POST", body: { item_id: itemId } });

// { royalties_cents, royalties, entries: [...] }
export const getRoyaltiesApi = () => api("/api/economy/royalties/");

// Test/dev accrual hook: { amount_cents, source } -> { royalties_cents, royalties }
export const accrueRoyaltiesApi = (amountCents, source = "") =>
  api("/api/economy/royalties/accrue/", { method: "POST", body: { amount_cents: amountCents, source } });

// plan: instant | weekly | monthly | quarterly -> { wallet, breakdown }
export const cashoutRoyaltiesApi = (plan) =>
  api("/api/economy/royalties/cashout/", { method: "POST", body: { plan } });

// { uploads: [{ id, name, size_bytes, size_mb, content_type, url, created_at }],
//   storage_used_mb, storage_mb, upload_mb, storage_free_mb }
export const getUploadsApi = () => api("/api/economy/uploads/");

// Multipart upload. Server enforces upload_mb (413) and storage_mb (409).
export const uploadFileApi = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api("/api/economy/uploads/", { method: "POST", body: fd });
};

export const deleteUploadApi = (id) =>
  api(`/api/economy/uploads/${id}/`, { method: "DELETE" });
