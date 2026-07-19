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

// VenueZ — { venues: [...] }
export const getVenuesApi = () => api("/api/economy/venues/");
export const createVenueApi = (v) => api("/api/economy/venues/", { method: "POST", body: v });
export const joinVenueApi = (id) => api(`/api/economy/venues/${id}/join/`, { method: "POST" });

// RateZ attractiveness — { median, count, public }
export const getAttractivenessApi = () => api("/api/economy/attractiveness/");
export const setAttractivenessOptInApi = (isPublic) =>
  api("/api/economy/attractiveness/", { method: "POST", body: { public: isPublic } });
export const rateAttractivenessApi = (targetUsername, score) =>
  api("/api/economy/attractiveness/rate/", { method: "POST", body: { target_username: targetUsername, score } });

// FaceZ — { mine: [...], feed: [...] } (each: id, owner, name, url, median, count, my_rating, mine)
export const getFacezApi = () => api("/api/economy/facez/");
export const createFaceApi = (file, name = "") => {
  const fd = new FormData();
  fd.append("image", file);
  if (name) fd.append("name", name);
  return api("/api/economy/facez/", { method: "POST", body: fd });
};
export const rateFaceApi = (id, score) => api(`/api/economy/facez/${id}/rate/`, { method: "POST", body: { score } });
export const deleteFaceApi = (id) => api(`/api/economy/facez/${id}/`, { method: "DELETE" });

// MerchZ — legal-goods marketplace
export const getMerchApi = () => api("/api/economy/merch/");
export const createMerchApi = ({ title, description, category, priceCents, image }) => {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("description", description || "");
  fd.append("category", category);
  fd.append("price_cents", priceCents);
  if (image) fd.append("image", image);
  return api("/api/economy/merch/", { method: "POST", body: fd });
};
export const buyMerchApi = (id) => api(`/api/economy/merch/${id}/buy/`, { method: "POST" });
export const deleteMerchApi = (id) => api(`/api/economy/merch/${id}/`, { method: "DELETE" });

// Cross-user profiles
export const saveProfileApi = (profile) => api("/api/economy/profile/", { method: "POST", body: profile });
export const getMemberApi = (username) => api(`/api/economy/members/${encodeURIComponent(username)}/`);
export const searchMembersApi = (filters) => {
  const p = new URLSearchParams();
  if (filters.regions?.length) p.set("regions", filters.regions.join(","));
  if (filters.genders?.length) p.set("genders", filters.genders.join(","));
  if (filters.signs?.length) p.set("signs", filters.signs.join(","));
  if (filters.substances?.length) p.set("substances", filters.substances.join(","));
  if (filters.sober) p.set("sober", "1");
  const q = p.toString();
  return api(`/api/economy/members/${q ? `?${q}` : ""}`);
};

// { stripe_enabled, stripe_publishable_key, paypal_enabled, min_cents, max_cents }
export const getCheckoutConfig = () => api("/api/economy/checkout/config/");

// Stripe Checkout — returns { url } to redirect the browser to.
export const createStripeCheckout = (amountCents) =>
  api("/api/economy/checkout/stripe/", { method: "POST", body: { amount_cents: amountCents } });

// PayPal — returns { id, approve_url } to redirect to; capture on return.
export const createPaypalOrder = (amountCents) =>
  api("/api/economy/checkout/paypal/", { method: "POST", body: { amount_cents: amountCents } });

export const capturePaypalOrder = (orderId) =>
  api("/api/economy/checkout/paypal/capture/", { method: "POST", body: { order_id: orderId } });
