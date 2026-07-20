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

// AI usage — charge the minimum cost to cover the model. 402 if short; owner free.
// Returns { model, cost_cents, money_cents, money }.
export const chargeAiApi = (model, note = "OCC AI usage") =>
  api("/api/economy/ai/charge/", { method: "POST", body: { model, note } });

// OCC's real LLM reply (Corey GPT etc.). Charges the model cost on success;
// 402 if short, 503 when the LLM backend isn't configured (fall back to local).
// Returns { text, model, cost_cents, money }.
export const occChatApi = ({ model, prompt, knowledge, history, slang, acronyms }) =>
  api("/api/economy/ai/occ/", { method: "POST", body: { model, prompt, knowledge, history, slang, acronyms } });

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

// PostZ — cross-user posts with visibility + restricted-join rewards
export const getPostzApi = (sort = "hot") => api(`/api/economy/postz/?sort=${sort}`);
export const createPostzApi = (post) => api("/api/economy/postz/", { method: "POST", body: post });
export const joinPostzApi = (id, activeSeconds = 0) => api(`/api/economy/postz/${id}/join/`, { method: "POST", body: { active_seconds: activeSeconds } });

// DirectZ collaborative video works (ReelZ / EpisodeZ / MovieZ)
export const getDirectzApi = (fmt) => api(`/api/economy/directz/${fmt ? `?fmt=${fmt}` : ""}`);
export const createDirectzApi = (work) => api("/api/economy/directz/", { method: "POST", body: work });
export const rateDirectzApi = (id, score) => api(`/api/economy/directz/${id}/rate/`, { method: "POST", body: { score } });

// Universal social layer (cross-user reactions + comments)
export const getSocialApi = (item) => api(`/api/economy/social/?item=${encodeURIComponent(item)}`);
export const reactSocialApi = (item, value) => api("/api/economy/social/react/", { method: "POST", body: { item, value } });
export const commentSocialApi = (item, body) => api("/api/economy/social/comment/", { method: "POST", body: { item, body } });
export const rateSocialApi = (item, score) => api("/api/economy/social/rate/", { method: "POST", body: { item, score } });

// Cross-user profiles
export const saveProfileApi = (profile) => api("/api/economy/profile/", { method: "POST", body: profile });
export const uploadAvatarApi = (file) => {
  const fd = new FormData();
  fd.append("avatar", file);
  return api("/api/economy/profile/avatar/", { method: "POST", body: fd });
};
// dimension: "overall" | "attractiveness"; score 1-10
export const rateProfileApi = (targetUsername, dimension, score) =>
  api("/api/economy/profile/rate/", { method: "POST", body: { target_username: targetUsername, dimension, score } });

// Moderation
export const reportItemApi = (item, reason, note = "") => api("/api/economy/report/", { method: "POST", body: { item, reason, note } });
export const blockUserApi = (username, action) => api("/api/economy/block/", { method: "POST", body: { username, action } });
export const getBlockedApi = () => api("/api/economy/block/");

// Notifications
export const getNotificationsApi = () => api("/api/economy/notifications/");
export const markNotificationApi = (opts) => api("/api/economy/notifications/", { method: "POST", body: opts }); // {id} or {all:true}

// Follow graph — action: "follow" | "unfollow". Returns counts + relationship.
export const followApi = (username, action) => api("/api/economy/follow/", { method: "POST", body: { username, action } });
export const getFollowApi = (username) => api(`/api/economy/follow/?username=${encodeURIComponent(username)}`);
export const getMemberApi = (username) => api(`/api/economy/members/${encodeURIComponent(username)}/`);
export const searchMembersApi = (filters) => {
  const p = new URLSearchParams();
  if (filters.regions?.length) p.set("regions", filters.regions.join(","));
  if (filters.genders?.length) p.set("genders", filters.genders.join(","));
  if (filters.signs?.length) p.set("signs", filters.signs.join(","));
  if (filters.substances?.length) p.set("substances", filters.substances.join(","));
  if (filters.sober) p.set("sober", "1");
  // Range gates (min/max). Only set the ones provided.
  for (const k of ["age_min", "age_max", "attr_min", "attr_max", "max_km"]) {
    if (filters[k] != null && filters[k] !== "") p.set(k, filters[k]);
  }
  const q = p.toString();
  return api(`/api/economy/members/${q ? `?${q}` : ""}`);
};

// Opt-in GPS location for in-person distance filtering.
export const setLocationApi = (share, lat, lng) =>
  api("/api/economy/profile/location/", { method: "POST", body: { share, lat, lng } });

// { stripe_enabled, stripe_publishable_key, paypal_enabled, min_cents, max_cents }
export const getCheckoutConfig = () => api("/api/economy/checkout/config/");

// 10-day downgrade-for-refund window.
export const getRefundWindowApi = () => api("/api/economy/membership/refund/");
export const refundMembershipApi = () => api("/api/economy/membership/refund/", { method: "POST" });

// Stripe Checkout — returns { url } to redirect the browser to.
export const createStripeCheckout = (amountCents) =>
  api("/api/economy/checkout/stripe/", { method: "POST", body: { amount_cents: amountCents } });

// PayPal — returns { id, approve_url } to redirect to; capture on return.
export const createPaypalOrder = (amountCents) =>
  api("/api/economy/checkout/paypal/", { method: "POST", body: { amount_cents: amountCents } });

export const capturePaypalOrder = (orderId) =>
  api("/api/economy/checkout/paypal/capture/", { method: "POST", body: { order_id: orderId } });

// Founding 50 — lifetime StatZ offer.
// GET: { claimed, limit, remaining, sold_out, tier, price_cents, full_price_cents, stripe_enabled }
export const getFoundingApi = () => api("/api/economy/founding/");
export const claimFoundingApi = () => api("/api/economy/founding/claim/", { method: "POST" });
export const foundingCheckoutApi = (plan = "lifetime") => api("/api/economy/founding/checkout/", { method: "POST", body: { plan } });
