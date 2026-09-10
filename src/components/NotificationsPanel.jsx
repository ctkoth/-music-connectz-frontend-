import { useState, useEffect } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { track } from "../track.js";

/**
 * Displays user's in-app notifications (habit reminders, etc).
 * Shows unread count and allows marking as read.
 * Fetches from /api/economy/notifications/
 */
export default function NotificationsPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const response = await api("/api/economy/notifications/", { method: "GET" });
      setNotifications(response.notifications || []);
      setUnread(response.unread || 0);
      track("notifications_viewed", { count: response.notifications?.length || 0 });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    setMarking({ ...marking, [notificationId]: true });
    try {
      const response = await api("/api/economy/notifications/", {
        method: "POST",
        body: { id: notificationId },
      });
      setUnread(response.unread || 0);
      // Remove from list or update read status
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      track("notification_marked_read", { notification_id: notificationId });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setMarking({ ...marking, [notificationId]: false });
    }
  }

  async function markAllAsRead() {
    setMarking({ all: true });
    try {
      const response = await api("/api/economy/notifications/", {
        method: "POST",
        body: { all: true },
      });
      setUnread(response.unread || 0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      track("all_notifications_marked_read", { count: notifications.length });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarking({ all: false });
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
      <div className="rounded-xl border border-mcz-cyan/30 bg-black/80 p-6 max-w-md w-full max-h-[80vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs uppercase tracking-wider text-mcz-cyan/70 mb-1">
              Notifications
            </p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">
                Habit Reminders
              </h2>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-emerald-500 rounded-full">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-mcz-cyan" size={20} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <Bell size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">
                Complete your habits to get reminders
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-lg border p-3 transition ${
                  notif.read
                    ? "border-white/10 bg-white/5"
                    : "border-emerald-300/30 bg-emerald-300/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell size={14} className="text-mcz-cyan flex-shrink-0" />
                      <span className="text-[11px] uppercase tracking-wider text-mcz-cyan/70">
                        {notif.kind === "habit_reminder" ? "Habit Reminder" : "Update"}
                      </span>
                    </div>
                    <p className="text-sm text-white break-words">{notif.text}</p>
                    <p className="text-[11px] text-white/40 mt-1">
                      {new Date(notif.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      disabled={marking[notif.id]}
                      className="flex-shrink-0 p-1.5 rounded hover:bg-emerald-300/20 transition text-emerald-300"
                      title="Mark as read"
                    >
                      {marking[notif.id] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2 border-t border-white/10">
          {unread > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={marking.all}
              className="flex-1 text-sm py-2 px-3 rounded border border-white/20 text-white/60 hover:border-white/40 hover:text-white/80 transition"
            >
              {marking.all ? (
                <>
                  <Loader2 className="animate-spin inline mr-1" size={14} />
                  Marking…
                </>
              ) : (
                "Mark all read"
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded neon-btn-primary text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
