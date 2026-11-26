import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Map as MapIcon, Search } from "lucide-react";
import { apiRequest } from "../api/client";
import { ComplaintCard } from "../components/ComplaintCard";
import { ComplaintMap } from "../components/ComplaintMap";
import { DemoBanner } from "../components/DemoBanner";
import type { Area, ComplaintCategory, ComplaintSummary } from "../types";

export const ExploreComplaintsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view") === "map" ? "map" : "grid";

  const [view, setView] = useState<"grid" | "list" | "map">(initialView);
  const [showDensity, setShowDensity] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [areaId, setAreaId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("newest");

  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  useEffect(() => {
    apiRequest<{ areas: Area[] }>("/api/areas").then((r) => setAreas(r.areas)).catch(() => {});
    apiRequest<{ categories: ComplaintCategory[] }>("/api/categories").then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "100" });
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (areaId) params.set("area_id", areaId);
    if (statusFilter) params.set("status", statusFilter);
    if (priority) params.set("priority_level", priority);

    apiRequest<{ total: number; items: ComplaintSummary[] }>(`/api/complaints?${params.toString()}`)
      .then((res) => {
        setComplaints(res.items);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category, areaId, statusFilter, priority, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">Explore Public Complaints</h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse all publicly reported infrastructure complaints across Bengaluru pilot zones without signing in.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm text-xs font-semibold">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              view === "grid" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grid
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              view === "list" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              view === "map" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map
          </button>
        </div>
      </div>

      <DemoBanner compact />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference ID, street, or description..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-civicTeal-600"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_key} value={c.category_key}>
                {c.display_name}
              </option>
            ))}
          </select>

          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Pilot Areas</option>
            {areas.map((a) => (
              <option key={a.area_id} value={a.area_id}>
                {a.area_name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
            <option value="RESOLVED_VERIFIED">Citizen Verified</option>
            <option value="DISPUTED">Disputed</option>
            <option value="OVERDUE">Overdue</option>
            <option value="REOPENED">Reopened</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Verification Status Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1">Verification Filter:</span>
          {[
            { value: "", label: "All" },
            { value: "AWAITING_VERIFICATION", label: "Awaiting Verification" },
            { value: "RESOLVED_VERIFIED", label: "Citizen Verified" },
            { value: "DISPUTED", label: "Disputed" },
            { value: "REOPENED", label: "Reopened" },
          ].map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                statusFilter === chip.value
                  ? "bg-navy-900 text-white border-navy-900"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span>
            Showing <strong>{complaints.length}</strong> of <strong>{total}</strong> public records
          </span>
          <div className="flex items-center gap-3">
            {view === "map" && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDensity}
                  onChange={(e) => setShowDensity(e.target.checked)}
                  className="accent-civicTeal-600"
                />
                Density overlay
              </label>
            )}
            <div className="flex items-center gap-1.5">
              <span>Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs bg-white font-medium"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest_priority">Highest Priority Score</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading public complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No complaints match the selected filters.
        </div>
      ) : view === "map" ? (
        <ComplaintMap complaints={complaints} areas={areas} height="560px" showDensity={showDensity} />
      ) : view === "list" ? (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintCard
              key={c.complaint_id}
              complaint={c}
              view="list"
              onSupported={(cid, cnt, score, lvl) =>
                setComplaints((prev) =>
                  prev.map((item) =>
                    item.complaint_id === cid
                      ? { ...item, support_count: cnt, priority_score: score, priority_level: lvl, user_has_supported: true }
                      : item
                  )
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {complaints.map((c) => (
            <ComplaintCard
              key={c.complaint_id}
              complaint={c}
              view="grid"
              onSupported={(cid, cnt, score, lvl) =>
                setComplaints((prev) =>
                  prev.map((item) =>
                    item.complaint_id === cid
                      ? { ...item, support_count: cnt, priority_score: score, priority_level: lvl, user_has_supported: true }
                      : item
                  )
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
