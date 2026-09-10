import { useEffect, useState } from "react";
import { HardDrive, AlertTriangle } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import TierUpgradePrompt from "./TierUpgradePrompt.jsx";

/**
 * Shows storage usage and warns when approaching tier limit.
 * Displays on homepage to drive upgrades at key friction point.
 */
export default function StorageWarning() {
  const { user } = useAuth();
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    async function loadStorage() {
      try {
        // Try to fetch from GameZ first since it has storage info
        const gameData = await api("/api/economy/gamez/");
        setStorage({
          used_mb: gameData.storage_used_mb || 0,
          total_mb: gameData.storage_mb || 0,
        });
      } catch {
        // Fallback: try to get from profile or other endpoints
        try {
          const profile = await api("/api/auth/me/");
          if (profile.storage_used_mb !== undefined && profile.storage_mb !== undefined) {
            setStorage({
              used_mb: profile.storage_used_mb,
              total_mb: profile.storage_mb,
            });
          }
        } catch {
          // If both fail, storage info is unavailable
        }
      } finally {
        setLoading(false);
      }
    }
    loadStorage();
  }, []);

  if (loading || !storage || !storage.total_mb) return null;

  const usagePercent = (storage.used_mb / storage.total_mb) * 100;
  const isNear = usagePercent >= 80; // Show warning at 80%
  const isNeeds = usagePercent > 95; // Red alert at 95%

  if (usagePercent < 80) return null; // Don't show until 80%

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg border p-4 space-y-2 ${
          isNeeds
            ? "border-mcz-ember/50 bg-mcz-ember/10"
            : "border-mcz-gold/30 bg-mcz-gold/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <HardDrive
            size={16}
            className={isNeeds ? "text-mcz-ember" : "text-mcz-gold"}
          />
          <p className={`text-sm font-medium ${isNeeds ? "text-mcz-ember" : "text-mcz-gold"}`}>
            {isNeeds ? "Storage almost full" : "Storage running low"}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-white/60">
            {storage.used_mb.toFixed(0)} / {storage.total_mb.toFixed(0)} MB
            used ({usagePercent.toFixed(0)}%)
          </p>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-colors ${
                isNeeds ? "bg-mcz-ember" : "bg-mcz-gold"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {isNeeds && (
          <p className={`text-[11px] ${isNeeds ? "text-mcz-ember" : "text-white/50"}`}>
            Upgrade to get more storage for posts, uploads and game assets.
          </p>
        )}
      </div>

      {isNear && (
        <TierUpgradePrompt
          limit="storage_mb"
          current={storage.used_mb}
          userTier={user?.tier || "free"}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            window.dispatchEvent(new CustomEvent("mcz-goto-tab", { detail: { tab: "membershipz", target: "" } }));
          }}
        />
      )}
    </div>
  );
}
