import { useState, useEffect } from "react";
import { Users, Star, BarChart3, Plus, MessageSquare, Loader2 } from "lucide-react";
import { api } from "../api.js";

export default function CoachZ() {
  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  useEffect(() => {
    loadStudio();
  }, []);

  const loadStudio = async () => {
    try {
      const data = await api("/api/economy/coachz/studio/");
      setStudio(data);
    } catch (e) {
      console.error("Failed to load studio:", e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/50">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading studio…
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center text-white/50">
          <p>Failed to load your coaching studio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            🏫 Your Coaching Studio
          </h1>
          <p className="text-white/50 mt-2">Rate your students' takes. Build your portfolio. Earn 🍥.</p>
        </div>

        {/* Studio Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card label="👥 Students" value={studio.coach.students_count} />
          <Card label="⭐ Takes Rated" value={studio.coach.takes_rated} />
          <Card label="🍥 Earned" value={studio.coach.referral_spinaz_earned} />
          <Card label="Today" value={studio.activity.takes_rated_today} />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-mcz-gold text-black font-semibold rounded hover:brightness-110"
          >
            <Plus size={16} />
            Invite Student
          </button>
        </div>

        {/* Students List */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={20} />
            Your Students
          </h2>

          {studio.students.length === 0 ? (
            <p className="text-white/50 text-sm">
              No students yet. 👋 Invite your first student to start coaching!
            </p>
          ) : (
            <div className="space-y-2">
              {studio.students.map((student) => (
                <div
                  key={student.id}
                  className="flex justify-between items-center p-3 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/5"
                >
                  <div>
                    <p className="font-semibold text-white">{student.name}</p>
                    <p className="text-xs text-white/50">
                      {student.takes_submitted} takes submitted
                    </p>
                  </div>
                  <div className="text-right text-sm text-white/60">
                    <span className="text-emerald-300">{student.takes_rated}</span> rated
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Ratings */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Star size={20} />
            Recent Ratings
          </h2>

          {studio.activity.recent_ratings.length === 0 ? (
            <p className="text-white/50 text-sm">No ratings yet. Start reviewing student takes!</p>
          ) : (
            <div className="space-y-3">
              {studio.activity.recent_ratings.slice(0, 10).map((rating, i) => (
                <div
                  key={i}
                  className="p-3 rounded bg-white/[0.03] border border-white/5 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-white">Take #{rating.take_id}</p>
                      <p className="text-xs text-white/50 mt-1">{new Date(rating.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Dimension Scores */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white/5 p-2 rounded">
                      <p className="text-white/60">🎵 Pitch</p>
                      <p className="font-semibold text-emerald-300">{rating.pitch}%</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded">
                      <p className="text-white/60">⏱️ Timing</p>
                      <p className="font-semibold text-emerald-300">{rating.timing}%</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded">
                      <p className="text-white/60">🎼 Tone</p>
                      <p className="font-semibold text-emerald-300">{rating.tone}%</p>
                    </div>
                  </div>

                  {rating.notes && (
                    <p className="text-xs text-white/70 bg-white/[0.02] p-2 rounded italic">
                      "{rating.notes}"
                    </p>
                  )}

                  <div className="text-xs text-emerald-300">
                    +5 🍥 earned for this rating
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.04] p-4">
          <p className="text-sm text-mcz-cyan font-semibold mb-2">💡 Coaching Tips</p>
          <ul className="text-xs text-white/60 space-y-1">
            <li>✓ Rate on real dimensions: pitch accuracy, timing, tone quality</li>
            <li>✓ Add notes to help students improve</li>
            <li>✓ Earn +5 🍥 per rating, +50 🍥 per new student</li>
            <li>✓ Your ratings become part of your public coaching portfolio</li>
          </ul>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onAdded={() => {
            setShowAddStudent(false);
            loadStudio();
          }}
        />
      )}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function AddStudentModal({ onClose, onAdded }) {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    if (!studentId.trim()) {
      setErr("Enter a student ID or username");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      await api("/api/economy/coachz/add-student/", {
        method: "POST",
        body: { student_id: parseInt(studentId) || studentId }
      });
      onAdded();
    } catch (e) {
      setErr(e.message || "Failed to add student");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="rounded-lg border border-white/20 bg-slate-900 p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-white">👥 Invite Student</h2>

        <div>
          <label className="block text-sm text-white/70 mb-2">Student ID or Username</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter student ID or username"
            className="neon-input w-full"
          />
        </div>

        {err && <p className="text-sm text-mcz-ember">{err}</p>}

        <div className="text-xs text-white/60 bg-white/5 p-3 rounded">
          💰 You'll earn +50 🍥 when a student joins your studio
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-mcz-gold text-black font-semibold rounded hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Student
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
