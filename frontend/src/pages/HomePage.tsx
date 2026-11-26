import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  Repeat,
  ShieldCheck,
  Sparkles,
  Trash2,
  Waves,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { ComplaintCard } from "../components/ComplaintCard";
import { ComplaintMap } from "../components/ComplaintMap";
import { DemoBanner } from "../components/DemoBanner";
import type { Area, ComplaintCategory, ComplaintSummary } from "../types";

interface PublicStats {
  total_complaints: number;
  resolved_verified: number;
  awaiting_verification: number;
  pending_complaints: number;
  overdue_complaints: number;
  recurring_issues_count: number;
}

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [recent, setRecent] = useState<ComplaintSummary[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  useEffect(() => {
    apiRequest<PublicStats>("/api/stats").then(setStats).catch(() => {});
    apiRequest<{ items: ComplaintSummary[] }>("/api/complaints?limit=12")
      .then((res) => setRecent(res.items))
      .catch(() => {});
    apiRequest<{ areas: Area[] }>("/api/areas")
      .then((res) => setAreas(res.areas))
      .catch(() => {});
    apiRequest<{ categories: ComplaintCategory[] }>("/api/categories")
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const categoryIcons: Record<string, React.ReactNode> = {
    potholes_road_damage: <AlertTriangle className="w-6 h-6 text-navy-700" />,
    garbage_accumulation: <Trash2 className="w-6 h-6 text-civicTeal-700" />,
    drainage_blockage: <Waves className="w-6 h-6 text-sky-700" />,
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-navy-900 text-white border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-civicTeal-100">
                <ShieldCheck className="w-4 h-4 text-civicTeal-500" />
                Report. Track. Verify. Improve.
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Your City. Your Voice. Our Shared Responsibility.
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Report public infrastructure problems, track real progress and help ensure that every
                reported issue receives the attention it deserves.
              </p>
              <p className="text-sm text-civicTeal-100/90 border-l-2 border-civicTeal-500 pl-3.5 max-w-xl">
                Most platforms help citizens report problems. CivicTrack goes further — it remembers
                recurring issues, tracks accountability and verifies whether public infrastructure problems
                are genuinely resolved.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/report"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-civicTeal-600 hover:bg-civicTeal-700 text-white font-semibold text-sm shadow-sm transition"
                >
                  <Camera className="w-4 h-4" /> Report an Issue
                </Link>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-navy-900 hover:bg-slate-100 font-semibold text-sm shadow-sm transition"
                >
                  Explore Public Complaints <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Live Stats Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
              <div className="bg-navy-800/90 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">Total Reports</p>
                <p className="text-3xl font-extrabold mt-1 text-white">
                  {stats ? stats.total_complaints : "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Calculated live from database</p>
              </div>
              <div className="bg-navy-800/90 border border-civicTeal-500/30 rounded-xl p-4">
                <p className="text-xs font-medium text-civicTeal-100 uppercase tracking-wider">Verified Resolved</p>
                <p className="text-3xl font-extrabold mt-1 text-civicTeal-500">
                  {stats ? stats.resolved_verified : "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Citizen-confirmed repairs</p>
              </div>
              <div className="bg-navy-800/90 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">Pending Active</p>
                <p className="text-3xl font-extrabold mt-1 text-amber-400">
                  {stats ? stats.pending_complaints : "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {stats ? `${stats.overdue_complaints} overdue escalations` : "Active queue"}
                </p>
              </div>
              <div className="bg-navy-800/90 border border-amber-500/30 rounded-xl p-4">
                <p className="text-xs font-medium text-amber-200 uppercase tracking-wider">Recurring Issues</p>
                <p className="text-3xl font-extrabold mt-1 text-orange-400">
                  {stats ? stats.recurring_issues_count : "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Civic Issue Memory links</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <DemoBanner />

        {/* Interactive Map Preview */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900">Live Public Infrastructure Map</h2>
              <p className="text-sm text-slate-600">
                Sample Bengaluru pilot zones with active complaints, priority color-coding, and verification status.
              </p>
            </div>
            <Link to="/explore?view=map" className="text-sm font-semibold text-civicTeal-700 hover:underline inline-flex items-center gap-1">
              Open Full Map Explorer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <ComplaintMap complaints={recent} areas={areas} height="380px" />
        </section>

        {/* Recent Public Complaints */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900">Recent Public Complaints</h2>
              <p className="text-sm text-slate-600">
                Transparently tracked from submission through department repair and citizen verification.
              </p>
            </div>
            <Link to="/explore" className="text-sm font-semibold text-civicTeal-700 hover:underline inline-flex items-center gap-1">
              View All Complaints <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.slice(0, 6).map((c) => (
              <ComplaintCard
                key={c.complaint_id}
                complaint={c}
                onSupported={(cid, cnt, score, lvl) =>
                  setRecent((prev) =>
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
        </section>

        {/* Three Core Innovations / Impact */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-civicTeal-700">Platform Impact</span>
            <h2 className="text-2xl font-bold text-navy-900 mt-1">
              Built for Accountability, Not Just Ticket Logging
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy-900">1. Civic Issue Memory</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Historical repairs are never deleted. When a pothole or clogged drain reappears at the same spot,
                CivicTrack automatically links it to past records and flags recurring hotspots.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-civicTeal-100 text-civicTeal-700 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy-900">2. Evidence-Based Resolution</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Officers must upload after-repair photographs before marking work complete. Original supporters compare
                before-and-after evidence and vote to confirm or dispute the repair.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-800 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy-900">3. Intelligent Prioritisation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Explainable 0–100 priority scoring balances safety severity (35%), time unresolved (20%), community
                support (20%), recurrence history (15%), and verified geo context (10%).
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900">How CivicTrack Works</h2>
              <p className="text-sm text-slate-600">End-to-end public accountability in four clear stages</p>
            </div>
            <Link to="/how-it-works" className="text-sm font-semibold text-civicTeal-700 hover:underline">
              Full Workflow Details
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Report & Duplicate Check", desc: "Upload a photo, pin GPS coordinates, and check nearby reports so efforts are combined rather than duplicated.", icon: <MapPin className="w-5 h-5 text-civicTeal-600" /> },
              { step: "02", title: "Hybrid Routing & Scoring", desc: "System suggests category & sample jurisdiction authority while calculating an explainable risk score.", icon: <Sparkles className="w-5 h-5 text-navy-700" /> },
              { step: "03", title: "Officer Action & Evidence", desc: "Authorised department officers start work within SLA deadlines and upload after-repair photographs.", icon: <Clock className="w-5 h-5 text-amber-600" /> },
              { step: "04", title: "Citizen Verification", desc: "Supporters inspect before-and-after photos to verify resolution — or dispute incomplete fixes.", icon: <CheckCircle2 className="w-5 h-5 text-civicTeal-700" /> },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-400 tracking-widest">STEP {item.step}</span>
                  {item.icon}
                </div>
                <h3 className="font-bold text-navy-900 text-sm mb-1.5">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Categories */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-navy-900">Supported Issue Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.category_id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  {categoryIcons[cat.category_key] || <AlertTriangle className="w-6 h-6 text-navy-700" />}
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-sm">{cat.display_name}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{cat.description}</p>
                  <p className="text-[11px] font-medium text-civicTeal-700 mt-2">
                    Configured SLA Target: {cat.default_sla_hours} hours
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
