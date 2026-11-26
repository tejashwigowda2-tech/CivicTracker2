import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "../api/client";
import { DemoBanner } from "../components/DemoBanner";
import { formatCategory, PriorityBadge, StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { Area, ComplaintCategory, ComplaintSummary, OfficerPerformance } from "../types";

interface AnalyticsData {
  summary: {
    total_complaints: number;
    new_complaints: number;
    pending_assignment: number;
    overdue_complaints: number;
    recurring_issues: number;
    high_priority_complaints: number;
    verification_disputes: number;
    verified_resolutions: number;
  };
  by_department: { name: string; count: number }[];
  by_area: { name: string; count: number }[];
  by_category: { name: string; count: number }[];
  by_status: { name: string; count: number }[];
  officer_performance: OfficerPerformance[];
}

interface Department {
  department_id: string;
  department_name: string;
  department_code: string;
}

interface Jurisdiction {
  mapping_id: string;
  department_id: string;
  department_name: string;
  department_code: string;
  area_id: string;
  area_name: string;
  complaint_category: string;
  ownership_type: string;
  confidence_or_source_notes?: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"analytics" | "review" | "config" | "officers" | "governance">("analytics");

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [pendingReview, setPendingReview] = useState<ComplaintSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [officers, setOfficers] = useState<OfficerPerformance[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [assignTarget, setAssignTarget] = useState<ComplaintSummary | null>(null);
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignOfficerId, setAssignOfficerId] = useState("");
  const [assignReopen, setAssignReopen] = useState(false);
  const [assignRemarks, setAssignRemarks] = useState("");

  // Quick configuration forms
  const [newJurDept, setNewJurDept] = useState("");
  const [newJurArea, setNewJurArea] = useState("");
  const [newJurCat, setNewJurCat] = useState("potholes_road_damage");
  const [newJurOwner, setNewJurOwner] = useState("Sample Municipal Jurisdiction");

  const [newCatKey, setNewCatKey] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatSla, setNewCatSla] = useState(72);

  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaCode, setNewAreaCode] = useState("");
  const [newAreaLat, setNewAreaLat] = useState(12.956);
  const [newAreaLng, setNewAreaLng] = useState(77.651);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = () => {
    apiRequest<AnalyticsData>("/api/admin/analytics").then(setAnalytics).catch(() => {});
    apiRequest<{ items: ComplaintSummary[] }>("/api/admin/complaints/pending-review")
      .then((r) => setPendingReview(r.items))
      .catch(() => {});
    apiRequest<{ departments: Department[] }>("/api/admin/departments")
      .then((r) => {
        setDepartments(r.departments);
        if (r.departments[0] && !newJurDept) setNewJurDept(r.departments[0].department_id);
      })
      .catch(() => {});
    apiRequest<{ areas: Area[] }>("/api/areas")
      .then((r) => {
        setAreas(r.areas);
        if (r.areas[0] && !newJurArea) setNewJurArea(r.areas[0].area_id);
      })
      .catch(() => {});
    apiRequest<{ categories: ComplaintCategory[] }>("/api/admin/categories")
      .then((r) => setCategories(r.categories))
      .catch(() => {});
    apiRequest<{ jurisdictions: Jurisdiction[] }>("/api/admin/jurisdictions")
      .then((r) => setJurisdictions(r.jurisdictions))
      .catch(() => {});
    apiRequest<{ officers: OfficerPerformance[] }>("/api/admin/officers")
      .then((r) => setOfficers(r.officers))
      .catch(() => {});
    apiRequest<{ escalations: any[] }>("/api/admin/escalations")
      .then((r) => setEscalations(r.escalations))
      .catch(() => {});
    apiRequest<{ logs: any[] }>("/api/admin/audit-logs")
      .then((r) => setAuditLogs(r.logs))
      .catch(() => {});
  };

  useEffect(() => {
    if (user?.role === "admin") loadAll();
  }, [user]);

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-navy-700 mx-auto" />
        <h1 className="text-xl font-bold text-navy-900">Administrator Authorisation Required</h1>
        <p className="text-sm text-slate-600">
          Please sign in with an administrator account to access routing reviews, SLA governance, and analytics.
        </p>
        <Link to="/officer-login" className="inline-block px-5 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold">
          Go to Staff Login
        </Link>
      </div>
    );
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget || !assignDeptId) return;
    setMsg(null);
    setErr(null);
    try {
      await apiRequest(`/api/admin/complaints/${assignTarget.complaint_id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          department_id: assignDeptId,
          assigned_officer_id: assignOfficerId || null,
          reopen: assignReopen,
          remarks: assignRemarks || undefined,
        }),
      });
      setMsg(`Updated assignment for ${assignTarget.reference_code}.`);
      setAssignTarget(null);
      loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to assign complaint.");
    }
  };

  const handleCreateJurisdiction = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await apiRequest("/api/admin/jurisdictions", {
        method: "POST",
        body: JSON.stringify({
          department_id: newJurDept,
          area_id: newJurArea,
          complaint_category: newJurCat,
          ownership_type: newJurOwner,
        }),
      });
      setMsg("Sample jurisdiction mapping added.");
      loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to create jurisdiction.");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await apiRequest("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          category_key: newCatKey,
          display_name: newCatName,
          default_sla_hours: Number(newCatSla),
        }),
      });
      setMsg(`Category '${newCatName}' configured.`);
      setNewCatKey("");
      setNewCatName("");
      loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to add category.");
    }
  };

  const handleUpdateCategorySla = async (cat: ComplaintCategory, sla: number) => {
    try {
      await apiRequest(`/api/admin/categories/${cat.category_id}`, {
        method: "PATCH",
        body: JSON.stringify({ default_sla_hours: sla }),
      });
      setMsg(`Updated SLA for ${cat.display_name} to ${sla}h.`);
      loadAll();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await apiRequest("/api/admin/areas", {
        method: "POST",
        body: JSON.stringify({
          area_name: newAreaName,
          ward_code: newAreaCode,
          center_lat: Number(newAreaLat),
          center_lng: Number(newAreaLng),
        }),
      });
      setMsg(`Added pilot area ${newAreaName}.`);
      setNewAreaName("");
      setNewAreaCode("");
      loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to create pilot area.");
    }
  };

  const runEscalationSweep = async () => {
    const res = await apiRequest<{ new_escalations_recorded: number }>("/api/admin/escalations/run-check", {
      method: "POST",
    });
    setMsg(`SLA escalation check completed (${res.new_escalations_recorded} new escalations recorded).`);
    loadAll();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-civicTeal-700">
            CivicTrack Oversight & Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-0.5">Administrator Portal</h1>
          <p className="text-xs text-slate-600 mt-1">
            Review uncertain routing, manage pilot areas & deadlines, monitor overdue escalations, and inspect audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={runEscalationSweep}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Run SLA Escalation Check
        </button>
      </div>

      <DemoBanner compact />

      {msg && <div className="bg-civicTeal-50 border border-civicTeal-500/40 text-civicTeal-700 rounded-xl px-4 py-2.5 text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{err}</div>}

      {/* KPI Strip */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Total", val: analytics.summary.total_complaints, cls: "text-navy-900" },
            { label: "New", val: analytics.summary.new_complaints, cls: "text-slate-700" },
            { label: "Pending Review", val: analytics.summary.pending_assignment, cls: "text-amber-700" },
            { label: "Overdue", val: analytics.summary.overdue_complaints, cls: "text-red-600" },
            { label: "Recurring", val: analytics.summary.recurring_issues, cls: "text-amber-700" },
            { label: "High/Critical", val: analytics.summary.high_priority_complaints, cls: "text-orange-600" },
            { label: "Disputes", val: analytics.summary.verification_disputes, cls: "text-red-600" },
            { label: "Verified", val: analytics.summary.verified_resolutions, cls: "text-civicTeal-700" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</p>
              <p className={`text-xl font-extrabold mt-1 ${k.cls}`}>{k.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: "analytics", label: "Analytics & Charts" },
          { id: "review", label: `Routing Review & Disputes (${pendingReview.length})` },
          { id: "config", label: "Jurisdictions, Areas & Deadlines" },
          { id: "officers", label: "Officer Performance" },
          { id: "governance", label: "Escalations & Audit Logs" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.id ? "bg-navy-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Analytics */}
      {tab === "analytics" && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900 mb-3">Complaints by Department Queue</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.by_department}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0F294A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900 mb-3">Complaints by Pilot Area</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.by_area}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0D9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Routing Review & Disputes */}
      {tab === "review" && (
        <div className="space-y-3">
          {pendingReview.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              No pending routing reviews, overdue items, or verification disputes.
            </div>
          ) : (
            pendingReview.map((c) => (
              <div key={c.complaint_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold bg-navy-50 text-navy-900 px-2 py-0.5 rounded">{c.reference_code}</span>
                    <span className="text-xs font-semibold text-civicTeal-700">{formatCategory(c.category)}</span>
                    <StatusBadge status={c.status} />
                    <PriorityBadge level={c.priority_level} score={c.priority_score} />
                  </div>
                  <p className="text-sm text-slate-800">{c.description}</p>
                  <p className="text-xs text-slate-500">
                    Area: {c.area_name || "Unmapped"} • Current Dept: {c.department_name || "None"} • {c.routing_reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/complaints/${c.complaint_id}`} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-navy-900">
                    Inspect
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTarget(c);
                      setAssignDeptId(c.department_id || departments[0]?.department_id || "");
                      setAssignOfficerId(c.assigned_officer_id || "");
                      setAssignReopen(c.status === "DISPUTED");
                      setAssignRemarks("");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-xs font-semibold"
                  >
                    Confirm / Reassign
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Jurisdictions, Areas & Deadlines */}
      {tab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories & Deadlines */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-900">Configurable Categories & SLA Deadlines</h2>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.category_id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <p className="font-bold text-navy-900">{cat.display_name}</p>
                    <p className="text-slate-500">Key: {cat.category_key} • Safety Base: {cat.base_safety_severity}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">SLA:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCategorySla(cat, Math.max(12, cat.default_sla_hours - 12))}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300"
                    >
                      -12h
                    </button>
                    <span className="font-bold text-navy-900 w-10 text-center">{cat.default_sla_hours}h</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCategorySla(cat, cat.default_sla_hours + 12)}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300"
                    >
                      +12h
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateCategory} className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="key (e.g. streetlights)"
                value={newCatKey}
                onChange={(e) => setNewCatKey(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Display Name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  value={newCatSla}
                  onChange={(e) => setNewCatSla(Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
                <button type="submit" className="flex-1 rounded-lg bg-navy-900 text-white text-xs font-semibold inline-flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </form>
          </div>

          {/* Pilot Areas */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-900">Pilot Areas (Sample Bengaluru Zones)</h2>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {areas.map((a) => (
                <div key={a.area_id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
                  <span className="font-bold text-navy-900">{a.area_name}</span>
                  <span className="text-slate-500">{a.ward_code}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleCreateArea} className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <input required placeholder="Area Name" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
              <input required placeholder="Code (BLR-PILOT-...)" value={newAreaCode} onChange={(e) => setNewAreaCode(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
              <input type="number" step="0.001" value={newAreaLat} onChange={(e) => setNewAreaLat(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
              <div className="flex gap-1.5">
                <input type="number" step="0.001" value={newAreaLng} onChange={(e) => setNewAreaLng(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
                <button type="submit" className="px-3 rounded-lg bg-navy-900 text-white text-xs font-semibold">Add</button>
              </div>
            </form>
          </div>

          {/* Hybrid Jurisdiction Mappings */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-900">Hybrid Department Jurisdiction Mappings (Demo)</h2>
            <form onSubmit={handleCreateJurisdiction} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <select value={newJurArea} onChange={(e) => setNewJurArea(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs">
                {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
              </select>
              <select value={newJurCat} onChange={(e) => setNewJurCat(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs">
                {categories.map((c) => <option key={c.category_key} value={c.category_key}>{c.display_name}</option>)}
              </select>
              <select value={newJurDept} onChange={(e) => setNewJurDept(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs">
                {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_code}</option>)}
              </select>
              <input value={newJurOwner} onChange={(e) => setNewJurOwner(e.target.value)} placeholder="Ownership note" className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
              <button type="submit" className="rounded-lg bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-xs font-semibold">
                Add Jurisdiction Mapping
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3">Pilot Area</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Mapped Dept Queue</th>
                    <th className="py-2">Ownership Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jurisdictions.map((j) => (
                    <tr key={j.mapping_id}>
                      <td className="py-2 pr-3 font-medium text-navy-900">{j.area_name}</td>
                      <td className="py-2 pr-3">{formatCategory(j.complaint_category)}</td>
                      <td className="py-2 pr-3 font-semibold text-civicTeal-700">{j.department_code}</td>
                      <td className="py-2 text-slate-600">{j.ownership_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Officer Performance */}
      {tab === "officers" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-x-auto">
          <h2 className="text-base font-bold text-navy-900 mb-3">Demonstration Officer Quality Analytics</h2>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Officer</th>
                <th className="py-2 pr-3">Dept / Zone</th>
                <th className="py-2 pr-3">Assigned</th>
                <th className="py-2 pr-3">Overdue</th>
                <th className="py-2 pr-3">Verified %</th>
                <th className="py-2 pr-3">Citizen Approval</th>
                <th className="py-2">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {officers.map((o) => (
                <tr key={o.officer_id}>
                  <td className="py-2.5 pr-3">
                    <p className="font-bold text-navy-900">{o.full_name}</p>
                    <p className="text-slate-500">{o.employee_id}</p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold">{o.department_code}</p>
                    <p className="text-slate-500">{o.assigned_area_name}</p>
                  </td>
                  <td className="py-2.5 pr-3 font-semibold">{o.total_assigned}</td>
                  <td className="py-2.5 pr-3 font-semibold text-red-600">{o.overdue}</td>
                  <td className="py-2.5 pr-3 font-semibold text-civicTeal-700">{o.verified_resolution_rate_pct}%</td>
                  <td className="py-2.5 pr-3">{o.citizen_approval_pct}%</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {o.badges.map((b, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[10px]">
                          {b.badge_name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Escalations & Audit Logs */}
      {tab === "governance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Recorded SLA Escalations
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {escalations.map((e) => (
                <div key={e.escalation_id} className="p-3 rounded-xl bg-red-50/60 border border-red-200 text-xs">
                  <div className="flex justify-between font-bold text-red-900">
                    <span>{e.reference_code} • Level {e.escalation_level}</span>
                    <span>{e.area_name}</span>
                  </div>
                  <p className="text-red-800 mt-1">{e.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-navy-700" /> System Audit Log
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((l) => (
                <div key={l.log_id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between font-semibold text-navy-900">
                    <span>{l.action}</span>
                    <span className="text-slate-500">{l.actor_name}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{l.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign / Reassign Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAssignSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-navy-900">Assign / Confirm — {assignTarget.reference_code}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department Queue</label>
              <select value={assignDeptId} onChange={(e) => setAssignDeptId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs">
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Officer (Optional)</label>
              <select value={assignOfficerId} onChange={(e) => setAssignOfficerId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs">
                <option value="">Auto-match officer for department & area</option>
                {officers.map((o) => (
                  <option key={o.officer_id} value={o.officer_id}>{o.full_name} ({o.department_code})</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={assignReopen} onChange={(e) => setAssignReopen(e.target.checked)} className="accent-civicTeal-600" />
              Mark status as REOPENED (recommended for disputed repairs)
            </label>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Remarks</label>
              <input
                type="text"
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                placeholder="Reason for assignment or reopening"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAssignTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-xs font-semibold">
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
