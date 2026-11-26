import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Play,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest, getCategoryFallbackPhoto, getImageUrl } from "../api/client";
import { DemoBanner } from "../components/DemoBanner";
import { formatCategory, PriorityBadge, StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { Area, ComplaintCategory, ComplaintSummary, OfficerPerformance } from "../types";

interface OfficerDashboardData {
  officer: {
    full_name: string;
    employee_id: string;
    department_name: string;
    assigned_area_name: string;
    designation: string;
  };
  stats: {
    total_assigned: number;
    pending: number;
    in_progress: number;
    awaiting_verification: number;
    overdue: number;
    verified_resolutions: number;
    disputed: number;
  };
  priority_distribution: { name: string; value: number }[];
  area_statistics: { area: string; count: number }[];
}

const PIE_COLORS = ["#DC2626", "#EA580C", "#D97706", "#0D9488"];

export const OfficerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"queue" | "performance">("queue");
  const [dashboard, setDashboard] = useState<OfficerDashboardData | null>(null);
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [performance, setPerformance] = useState<OfficerPerformance | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [completingComplaint, setCompletingComplaint] = useState<ComplaintSummary | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [completeRemarks, setCompleteRemarks] = useState("Repair completed on site; photo evidence attached.");
  const [internalNote, setInternalNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = () => {
    apiRequest<OfficerDashboardData>("/api/officers/dashboard").then(setDashboard).catch(() => {});
    apiRequest<OfficerPerformance | { officers: OfficerPerformance[] }>("/api/officers/performance")
      .then((res) => {
        if ("officers" in res) {
          setPerformance(res.officers[0] || null);
        } else {
          setPerformance(res);
        }
      })
      .catch(() => {});
  };

  const loadComplaints = () => {
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterArea) params.set("area_id", filterArea);
    if (filterPriority) params.set("priority_level", filterPriority);
    if (filterStatus) params.set("status", filterStatus);
    apiRequest<{ items: ComplaintSummary[] }>(`/api/officers/complaints?${params.toString()}`)
      .then((res) => setComplaints(res.items))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user || (user.role !== "officer" && user.role !== "admin")) return;
    loadAll();
    apiRequest<{ areas: Area[] }>("/api/areas").then((r) => setAreas(r.areas)).catch(() => {});
    apiRequest<{ categories: ComplaintCategory[] }>("/api/categories").then((r) => setCategories(r.categories)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || (user.role !== "officer" && user.role !== "admin")) return;
    loadComplaints();
  }, [user, filterCategory, filterArea, filterPriority, filterStatus]);

  if (!user || (user.role !== "officer" && user.role !== "admin")) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-navy-700 mx-auto" />
        <h1 className="text-xl font-bold text-navy-900">Department Officer Authorisation Required</h1>
        <p className="text-sm text-slate-600">
          Please sign in with an authorised demonstration officer account to access assigned complaint queues.
        </p>
        <Link to="/officer-login" className="inline-block px-5 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold">
          Go to Officer Login
        </Link>
      </div>
    );
  }

  const handleStartWork = async (c: ComplaintSummary) => {
    setBusyId(c.complaint_id);
    setError(null);
    setFeedback(null);
    try {
      await apiRequest(`/api/officers/complaints/${c.complaint_id}/start`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: "Officer acknowledged and started field work." }),
      });
      setFeedback(`Work started on ${c.reference_code}.`);
      loadAll();
      loadComplaints();
    } catch (err: any) {
      setError(err.message || "Could not start work.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReopenDisputed = async (c: ComplaintSummary) => {
    setBusyId(c.complaint_id);
    setError(null);
    setFeedback(null);
    try {
      await apiRequest(`/api/officers/complaints/${c.complaint_id}/reopen`, {
        method: "POST",
        body: JSON.stringify({ remarks: "Officer reopened disputed complaint for corrective repair." }),
      });
      setFeedback(`Complaint ${c.reference_code} reopened for corrective repair.`);
      loadAll();
      loadComplaints();
    } catch (err: any) {
      setError(err.message || "Could not reopen complaint.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingComplaint || !afterImage) return;
    setBusyId(completingComplaint.complaint_id);
    setError(null);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append("after_image", afterImage);
      form.append("remarks", completeRemarks);
      if (internalNote.trim()) form.append("internal_remarks", internalNote.trim());
      await apiRequest(`/api/officers/complaints/${completingComplaint.complaint_id}/complete`, {
        method: "POST",
        body: form,
      });
      setFeedback(`After-repair evidence uploaded for ${completingComplaint.reference_code}. Moved to Awaiting Verification.`);
      setCompletingComplaint(null);
      setAfterImage(null);
      setInternalNote("");
      loadAll();
      loadComplaints();
    } catch (err: any) {
      setError(err.message || "Failed to upload completion evidence.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-civicTeal-700">
            Restricted Department Officer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-0.5">
            {dashboard?.officer.department_name || "Officer Workspace"}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {dashboard?.officer.full_name} ({dashboard?.officer.employee_id}) • {dashboard?.officer.designation} • Assigned Zone:{" "}
            <strong>{dashboard?.officer.assigned_area_name}</strong>
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("queue")}
            className={`px-4 py-2 rounded-lg transition ${tab === "queue" ? "bg-navy-900 text-white" : "text-slate-600"}`}
          >
            Assigned Complaints Queue
          </button>
          <button
            type="button"
            onClick={() => setTab("performance")}
            className={`px-4 py-2 rounded-lg transition ${tab === "performance" ? "bg-navy-900 text-white" : "text-slate-600"}`}
          >
            Performance & Recognition
          </button>
        </div>
      </div>

      <DemoBanner compact />

      {feedback && <div className="bg-civicTeal-50 border border-civicTeal-500/40 text-civicTeal-700 rounded-xl px-4 py-2.5 text-sm">{feedback}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}

      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Assigned", val: dashboard.stats.total_assigned, cls: "text-navy-900" },
            { label: "Pending", val: dashboard.stats.pending, cls: "text-amber-700" },
            { label: "In Progress", val: dashboard.stats.in_progress, cls: "text-sky-700" },
            { label: "Awaiting Verify", val: dashboard.stats.awaiting_verification, cls: "text-civicTeal-700" },
            { label: "Overdue", val: dashboard.stats.overdue, cls: "text-red-600" },
            { label: "Verified Resolved", val: dashboard.stats.verified_resolutions, cls: "text-civicTeal-700" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${kpi.cls}`}>{kpi.val}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "queue" ? (
        <div className="space-y-6">
          {/* Charts Row */}
          {dashboard && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-navy-900 mb-3">Priority Distribution</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dashboard.priority_distribution} dataKey="value" nameKey="name" outerRadius={75} label>
                        {dashboard.priority_distribution.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-navy-900 mb-3">Area-Wise Assigned Statistics</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.area_statistics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0F294A" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_key} value={c.category_key}>{c.display_name}</option>
              ))}
            </select>
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All Areas</option>
              {areas.map((a) => (
                <option key={a.area_id} value={a.area_id}>{a.area_name}</option>
              ))}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="OVERDUE">Overdue</option>
              <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
              <option value="DISPUTED">Disputed</option>
              <option value="REOPENED">Reopened</option>
              <option value="RESOLVED_VERIFIED">Resolved Verified</option>
            </select>
          </div>

          {/* Assigned Complaints List */}
          <div className="space-y-3">
            {complaints.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                No complaints match the current department & area filters.
              </div>
            ) : (
              complaints.map((c) => (
                <div key={c.complaint_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-44 h-32 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={getImageUrl(c.thumbnail_url) || getCategoryFallbackPhoto(c.category, "BEFORE")}
                      alt={c.reference_code}
                      onError={(e) => {
                        e.currentTarget.src = getCategoryFallbackPhoto(c.category, "BEFORE");
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold bg-navy-50 text-navy-900 px-2.5 py-0.5 rounded">{c.reference_code}</span>
                        <span className="text-xs font-semibold text-civicTeal-700">{formatCategory(c.category)}</span>
                        <StatusBadge status={c.status} />
                        <PriorityBadge level={c.priority_level} score={c.priority_score} />
                      </div>
                      <Link to={`/complaints/${c.complaint_id}`} className="text-xs font-semibold text-navy-800 hover:underline inline-flex items-center gap-1">
                        Public Page <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <p className="text-sm text-slate-800">{c.description}</p>
                    <p className="text-xs text-slate-500">
                      Location: {c.address_hint || c.area_name} ({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}) • Community Support: <strong>{c.support_count}</strong>
                    </p>
                    {c.internal_remarks && (
                      <p className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700">
                        <strong>Internal Officer Notes:</strong> {c.internal_remarks}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {["ASSIGNED", "OVERDUE", "REOPENED", "DISPUTED", "UNDER_REVIEW"].includes(c.status) && (
                        <button
                          type="button"
                          disabled={busyId === c.complaint_id}
                          onClick={() => handleStartWork(c)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          <Play className="w-3.5 h-3.5" /> Start Work
                        </button>
                      )}
                      {["IN_PROGRESS", "ASSIGNED", "OVERDUE", "REOPENED", "DISPUTED"].includes(c.status) && (
                        <button
                          type="button"
                          onClick={() => setCompletingComplaint(c)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-xs font-semibold"
                        >
                          <Camera className="w-3.5 h-3.5" /> Mark Work as Completed
                        </button>
                      )}
                      {c.status === "DISPUTED" && (
                        <button
                          type="button"
                          disabled={busyId === c.complaint_id}
                          onClick={() => handleReopenDisputed(c)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          Reopen Complaint
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Performance & Quality-Based Recognition Tab */
        performance && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
              <strong>Quality-Based Officer Recognition (Demonstration Data):</strong> Badges reward timely response,
              citizen-verified resolutions, low recurrence rates, and consistency — never raw ticket-closing volume alone.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Avg Acknowledgement</span>
                <p className="text-2xl font-extrabold text-navy-900 mt-1">{performance.avg_acknowledgement_hours} hrs</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-xs text-slate-500 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Avg Resolution Time</span>
                <p className="text-2xl font-extrabold text-navy-900 mt-1">{performance.avg_resolution_hours} hrs</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-civicTeal-600" /> Verified Resolution Rate</span>
                <p className="text-2xl font-extrabold text-civicTeal-700 mt-1">{performance.verified_resolution_rate_pct}%</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-xs text-slate-500">Citizen Approval / Recurrence</span>
                <p className="text-2xl font-extrabold text-navy-900 mt-1">
                  {performance.citizen_approval_pct}% <span className="text-xs font-normal text-slate-500">/ {performance.recurring_issue_rate_pct}% rec.</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" /> Earned Recognition Badges (Demo)
              </h2>
              {performance.badges.length === 0 ? (
                <p className="text-sm text-slate-500">No recognition badges recorded yet for this account.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {performance.badges.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy-900">{b.badge_name}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{b.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Complete Work Modal */}
      {completingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCompleteSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-navy-900">
              Submit Repair Evidence — {completingComplaint.reference_code}
            </h3>
            <p className="text-xs text-slate-600">
              Uploading an after-repair photograph is mandatory. The complaint will enter{" "}
              <strong>Awaiting Verification</strong> so original supporters can inspect and confirm completion.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">After-Repair Photograph *</label>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setAfterImage(e.target.files?.[0] || null)}
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Public Completion Remarks</label>
              <textarea
                rows={2}
                value={completeRemarks}
                onChange={(e) => setCompleteRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Officer Note (Private)</label>
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Material used, crew ID (never shown publicly)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCompletingComplaint(null);
                  setAfterImage(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!afterImage || busyId === completingComplaint.complaint_id}
                className="px-4 py-2 rounded-xl bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                Mark Work as Completed
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
