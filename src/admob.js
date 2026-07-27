// Native AdMob rewarded-video client. Only runs inside the Capacitor app; on the
// web it's a no-op (the plugin is never imported). The AdZ tab dispatches
// `mcz-show-rewarded-ad` with { unitId, personalized }; we show the ad, pass the
// member id as SSV custom_data so Google's server-side callback credits the
// right user, and request non-personalized ads for minors (npa).
import { tokenStore } from "./api.js";

// The signed-in member id, read from the JWT (unverified decode — just the claim).
function currentUserId() {
  try {
    const payload = JSON.parse(atob(tokenStore.get().split(".")[1]));
    return String(payload.user_id ?? payload.sub ?? "");
  } catch {
    return "";
  }
}

const isNative = () =>
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();

let initialized = false;

export function initAdMob() {
  if (!isNative()) return; // web: nothing to do

  window.addEventListener("mcz-show-rewarded-ad", async (e) => {
    const { unitId, personalized } = e.detail || {};
    if (!unitId) return;
    try {
      const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");
      if (!initialized) {
        await AdMob.initialize({});
        initialized = true;
      }
      // Reward is granted server-side via SSV; surface it so AdZ can refresh.
      const rewarded = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        window.dispatchEvent(new CustomEvent("mcz-ad-rewarded"));
      });
      const userId = currentUserId();
      await AdMob.prepareRewardVideoAd({
        adId: unitId,
        npa: personalized ? undefined : true, // non-personalized for minors / unknown age
        ...(userId ? { ssv: { customData: userId } } : {}),
      });
      await AdMob.showRewardVideoAd();
      rewarded.remove?.();
    } catch (err) {
      window.dispatchEvent(new CustomEvent("mcz-ad-error", { detail: String(err?.message || err) }));
    }
  });
}
