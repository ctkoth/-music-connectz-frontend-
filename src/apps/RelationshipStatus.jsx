import { useState, useEffect } from "react";
import { Heart, AlertCircle, CheckCircle2, X } from "lucide-react";
import { api } from "../api.js";

/**
 * RelationshipStatus — declare relationship status and tag members.
 *
 * Members set their relationship status (single, in a relationship, married, etc.)
 * and can tag other members with relationship types (partner, spouse, family, friend,
 * collaborator). This helps members find and connect with the right community.
 *
 * Like DisabilitieZ, this is a DECLARATION, not a diagnosis. The user controls
 * what they share.
 */
export default function RelationshipStatus() {
  const [status, setStatus] = useState("");
  const [availableStatuses, setAvailableStatuses] = useState({});
  const [taggedMembers, setTaggedMembers] = useState([]);
  const [availableRelationshipTypes, setAvailableRelationshipTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [selectedType, setSelectedType] = useState("friend");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const data = await api("/api/economy/relationships/status/");
      setStatus(data.status || "");
      setAvailableStatuses(data.available_statuses || {});
      setTaggedMembers(data.tagged_members || []);
      setAvailableRelationshipTypes(data.relationship_types || []);
      setError("");
    } catch (err) {
      setError("Failed to load relationship settings: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const result = await api("/api/economy/relationships/status/", {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(result.status || "");
      setSuccess("Relationship status updated.");
    } catch (err) {
      setError("Failed to update status: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTag() {
    if (!searchUsername.trim()) {
      setError("Please enter a username.");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const result = await api("/api/economy/relationships/status/", {
        method: "PATCH",
        body: JSON.stringify({
          action: "add_tag",
          username: searchUsername.trim(),
          type: selectedType,
        }),
      });
      setTaggedMembers(result.tagged_members || []);
      setSearchUsername("");
      setSelectedType("friend");
      setSuccess(`Added ${searchUsername} as ${selectedType}.`);
    } catch (err) {
      setError("Failed to add member: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveTag(username) {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const result = await api("/api/economy/relationships/status/", {
        method: "PATCH",
        body: JSON.stringify({
          action: "remove_tag",
          username,
        }),
      });
      setTaggedMembers(result.tagged_members || []);
      setSuccess(`Removed ${username}.`);
    } catch (err) {
      setError("Failed to remove member: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-white/60">Loading relationship settings...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart size={24} className="text-mcz-ember" /> Relationships
        </h1>
        <p className="text-sm text-white/60 mt-2">
          Declare your relationship status and tag members you know. This helps you connect
          with community and find the right collaborators and friends.
        </p>
      </div>

      {error && (
        <div className="bg-mcz-ember/20 border border-mcz-ember rounded-lg p-3 text-sm text-mcz-ember flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/20 border border-emerald-500 rounded-lg p-3 text-sm text-emerald-300 flex gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Relationship Status */}
      <div className="space-y-4">
        <h2 className="font-semibold text-white">Relationship Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(availableStatuses).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              disabled={saving}
              className={`p-3 rounded-lg text-sm font-medium transition ${
                status === key
                  ? "bg-mcz-ember text-white border border-mcz-ember"
                  : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
              } disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Member Tags */}
      <div className="space-y-4 border-t border-white/10 pt-4">
        <h2 className="font-semibold text-white">Tag Members</h2>
        <p className="text-sm text-white/60">
          Tag members to let them know how you're connected — as partners, friends,
          family, or collaborators.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="text"
              placeholder="Username"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              disabled={saving}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-mcz-cyan disabled:opacity-50"
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
            />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={saving}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-mcz-cyan disabled:opacity-50"
            >
              {availableRelationshipTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleAddTag}
              disabled={saving || !searchUsername.trim()}
              className="px-4 py-2 bg-mcz-cyan text-black font-semibold rounded-lg hover:bg-mcz-cyan/90 disabled:opacity-50 transition"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Tagged Members */}
      {taggedMembers && taggedMembers.length > 0 && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <h2 className="font-semibold text-white">Your Tagged Members</h2>
          <div className="space-y-2">
            {taggedMembers.map((member) => (
              <div
                key={member.username}
                className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-white">{member.username}</div>
                  <div className="text-xs text-white/40">{member.type}</div>
                </div>
                <button
                  onClick={() => handleRemoveTag(member.username)}
                  disabled={saving}
                  className="p-1 hover:bg-mcz-ember/20 rounded transition disabled:opacity-50"
                  title="Remove"
                >
                  <X size={18} className="text-white/60 hover:text-mcz-ember" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      {taggedMembers.length === 0 && (
        <div className="bg-mcz-ember/5 border border-mcz-ember/20 rounded-lg p-4">
          <p className="text-sm text-white/70">
            Tag members to help build your community. Let people know if they're your partner,
            family, friend, or collaborator. You can always update or remove tags later.
          </p>
        </div>
      )}
    </div>
  );
}
