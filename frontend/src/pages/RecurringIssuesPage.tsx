import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Repeat } from "lucide-react";
import { apiRequest } from "../api/client";
import { ComplaintMap } from "../components/ComplaintMap";
import { DemoBanner } from "../components/DemoBanner";
import { formatCategory, PriorityBadge, StatusBadge } from "../components/StatusBadge";
import type { Area } from "../types";

interface RecurringResponse {
  total_recurrence_links: number;
  recurring_issues: {
    recurrence_id: string;
    similarity_reason: string;
    review_status: string;
    previous_complaint: {
      complaint_id: string;
      reference_code: string;
      category: string;
      address_hint: string;
      status: string;
      created_at?: string;
      resolved_at?: string;
      latitude: number;
      longitude: number;
    };
    new_complaint: {
      complaint_id: string;
      reference_code: string;
      category: string;
      address_hint: string;
      area_name?: string;
      status: string;
      priority_level: string;
      priority_score: number;
      created_at?: string;
      latitude: number;
      longitude: number;
    };
  }[];
  hotspots: {
    cluster_key: string;
    category: string;
    area_name: string;
    address_hint: string;
    latitude: number;
    longitude: number;
    occurrences: number;
    complaint_refs: string[];
  }[];
}

export const RecurringIssuesPage: React.FC = () => {
  const [data, setData] = useState<RecurringResponse | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    apiRequest<RecurringResponse>("/api/recurring-issues").then(setData).catch(() => {});
    apiRequest<{ areas: Area[] }>("/api/areas").then((r) => setAreas(r.areas)).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">
          <Repeat className="w-4 h-4" /> Civic Issue Memory
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
          Recurring Infrastructure Issues & Hotspots
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          CivicTrack never deletes or overwrites historical repairs. When a similar infrastructure failure reappears
          at a previously repaired site, it is linked to surface systemic maintenance gaps.
        </p>
      </div>

      <DemoBanner compact />

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Linked Recurrence Pairs</p>
              <p className="text-2xl font-extrabold text-navy-900 mt-1">{data.total_recurrence_links}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Identified Hotspot Clusters</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{data.hotspots.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Priority Recurrence Weight</p>
              <p className="text-2xl font-extrabold text-civicTeal-700 mt-1">15%</p>
            </div>
          </div>

          <ComplaintMap
            areas={areas}
            hotspots={data.hotspots}
            height="380px"
          />

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-navy-900">Linked Historical-to-Current Recurrence Chains</h2>
            {data.recurring_issues.map((item) => (
              <div
                key={item.recurrence_id}
                className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                    <Repeat className="w-3.5 h-3.5" /> {formatCategory(item.new_complaint.category)} • {item.review_status}
                  </span>
                  <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-civicTeal-600" />
                    {item.new_complaint.area_name || item.new_complaint.address_hint}
                  </span>
                </div>

                <p className="text-xs text-slate-700">{item.similarity_reason}</p>

                <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                  <Link
                    to={`/complaints/${item.previous_complaint.complaint_id}`}
                    className="md:col-span-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-navy-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-900">
                        Previous: {item.previous_complaint.reference_code}
                      </span>
                      <StatusBadge status={item.previous_complaint.status} />
                    </div>
                    <p className="text-xs text-slate-600">{item.previous_complaint.address_hint}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Reported:{" "}
                      {item.previous_complaint.created_at
                        ? new Date(item.previous_complaint.created_at).toLocaleDateString("en-IN")
                        : "—"}
                      {item.previous_complaint.resolved_at
                        ? ` • Resolved: ${new Date(item.previous_complaint.resolved_at).toLocaleDateString("en-IN")}`
                        : ""}
                    </p>
                  </Link>

                  <div className="md:col-span-1 flex justify-center text-amber-600">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  <Link
                    to={`/complaints/${item.new_complaint.complaint_id}`}
                    className="md:col-span-5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-900">
                        Recurrence: {item.new_complaint.reference_code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge
                          level={item.new_complaint.priority_level}
                          score={item.new_complaint.priority_score}
                        />
                        <StatusBadge status={item.new_complaint.status} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{item.new_complaint.address_hint}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Re-reported:{" "}
                      {item.new_complaint.created_at
                        ? new Date(item.new_complaint.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </p>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
