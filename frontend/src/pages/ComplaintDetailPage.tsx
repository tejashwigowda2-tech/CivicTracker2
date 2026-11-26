import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  MapPin,
  Repeat,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { BeforeAfterCompare } from "../components/BeforeAfterCompare";
import { ComplaintMap } from "../components/ComplaintMap";
import { formatCategory, formatStatus, PriorityBadge, StatusBadge } from "../components/StatusBadge";
import { TimelineView } from "../components/TimelineView";
import { useAuth } from "../context/AuthContext";
import type { ComplaintDetail } from "../types";

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadDetail = () => {
    if (!id) return;
    apiRequest<ComplaintDetail>(`/api/complaints/${id}`)
      .then((res) => {
        setComplaint(res);
        setError(null);
      })
      .catch((err) => setError(err.message || "Complaint not found"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [id, user]);

  const handleSupport = async () => {
    if (!complaint) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiRequest(`/api/complaints/${complaint.complaint_id}/support`, { method: "POST" });
      setActionMsg("Your community support has been recorded and priority score updated.");
      loadDetail();
    } catch (err: any) {
      setActionErr(err.message || "Could not record support.");
    }
  };

  const handleVote = async (vote: "WORK_COMPLETED" | "ISSUE_STILL_EXISTS") => {
    if (!complaint) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiRequest(`/api/complaints/${complaint.complaint_id}/verify`, {
        method: "POST",
        body: JSON.stringify({ vote }),
      });
      setActionMsg("Your verification vote has been recorded.");
      loadDetail();
    } catch (err: any) {
      setActionErr(err.message || "Could not submit verification vote.");
    }
  };

  const handleReopen = async () => {
    if (!complaint) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiRequest(`/api/officers/complaints/${complaint.complaint_id}/reopen`, {
        method: "POST",
        body: JSON.stringify({ remarks: "Reopened for corrective repair after citizen verification dispute." }),
      });
      setActionMsg("Complaint reopened for corrective repair.");
      loadDetail();
    } catch (err: any) {
      setActionErr(err.message || "Could not reopen complaint.");
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">Loading complaint record...</div>;
  }
  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-red-700 font-semibold">{error || "Complaint not found."}</p>
        <Link to="/explore" className="text-sm font-semibold text-navy-900 underline">Back to Explore Complaints</Link>
      </div>
    );
  }

  const ver = complaint.verification;
  const rec = complaint.recurrence;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Complaints
        </Link>
        <span className="text-xs text-slate-500">
          Public Transparency Record • Reporter identity & internal notes withheld for privacy
        </span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-extrabold text-navy-900 bg-navy-50 px-3 py-1 rounded-lg">
                {complaint.reference_code}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-civicTeal-700">
                {formatCategory(complaint.category)}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge level={complaint.priority_level} score={complaint.priority_score} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900 pt-1">
              {complaint.description || "Public infrastructure issue reported"}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-civicTeal-600" />
                {complaint.address_hint || complaint.area_name || "Bengaluru Pilot"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Reported: {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-navy-700" />
                {complaint.department_name || "Pending Routing Review"}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {user ? (
              user.role === "citizen" ? (
                <button
                  type="button"
                  disabled={complaint.user_has_supported}
                  onClick={handleSupport}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    complaint.user_has_supported
                      ? "bg-civicTeal-50 text-civicTeal-700 border border-civicTeal-500/40 cursor-default"
                      : "bg-navy-900 hover:bg-navy-800 text-white shadow-sm"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {complaint.user_has_supported ? "Supported" : "Support This Issue"}
                </button>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
                  Only citizen accounts can support issues
                </span>
              )
            ) : (
              <Link
                to="/citizen-login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800"
              >
                <ThumbsUp className="w-4 h-4" /> Support This Issue (Sign In)
              </Link>
            )}
            <span className="text-xs font-semibold text-slate-600">
              {complaint.support_count} {complaint.support_count === 1 ? "Supporter" : "Supporters"}
            </span>
          </div>
        </div>

        {actionMsg && <div className="bg-civicTeal-50 border border-civicTeal-500/30 text-civicTeal-700 rounded-xl px-4 py-2.5 text-xs font-medium">{actionMsg}</div>}
        {actionErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-medium">{actionErr}</div>}

        {/* Civic Issue Memory Alert */}
        {rec.is_recurring && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
              <Repeat className="w-5 h-5 text-amber-700" />
              RECURRING INFRASTRUCTURE ISSUE — This location has previously had a reported and resolved complaint.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {rec.previous_issues.map((prev) => (
                <Link
                  key={prev.recurrence_id}
                  to={`/complaints/${prev.complaint_id}`}
                  className="bg-white border border-amber-200 rounded-lg p-3 text-xs hover:border-amber-400 transition block"
                >
                  <div className="flex items-center justify-between font-bold text-navy-900">
                    <span>Previous: {prev.reference_code}</span>
                    <span>{formatStatus(prev.status)}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{prev.similarity_reason}</p>
                  <p className="text-slate-500 mt-1">
                    Reported: {prev.reported_at ? new Date(prev.reported_at).toLocaleDateString("en-IN") : "—"}
                    {prev.resolved_at ? ` • Repaired: ${new Date(prev.resolved_at).toLocaleDateString("en-IN")}` : ""}
                  </p>
                </Link>
              ))}
              {rec.subsequent_issues.map((nxt) => (
                <Link
                  key={nxt.recurrence_id}
                  to={`/complaints/${nxt.complaint_id}`}
                  className="bg-white border border-amber-200 rounded-lg p-3 text-xs hover:border-amber-400 transition block"
                >
                  <div className="flex items-center justify-between font-bold text-navy-900">
                    <span>Subsequent Recurrence: {nxt.reference_code}</span>
                    <span>{formatStatus(nxt.status)}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{nxt.similarity_reason}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Overdue / Escalation Alert */}
        {complaint.escalations.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" /> Escalation Recorded Within CivicTrack
            </div>
            {complaint.escalations.map((esc) => (
              <p key={esc.escalation_id} className="text-xs text-red-700">
                <strong>Level {esc.escalation_level}:</strong> {esc.reason}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Prominent Citizen Work Completion Verification Section */}
          {complaint.status === "AWAITING_VERIFICATION" && (
            <div className="bg-white rounded-2xl border-2 border-civicTeal-500 p-6 shadow-md space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-civicTeal-100 text-civicTeal-700 mb-1.5">
                    Awaiting Citizen Verification
                  </span>
                  <h2 className="text-xl font-extrabold text-navy-900">Verify Work Completion</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Review the before-and-after repair evidence below and confirm whether this issue was genuinely resolved.
                  </p>
                </div>
                <span className="text-xs font-bold text-navy-900 bg-slate-100 px-3 py-1 rounded-full">
                  {ver.total_votes} / {ver.min_votes_required} minimum votes
                </span>
              </div>

              {/* Complaint Description, Location & Officer Completion Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Complaint Description</span>
                  <span className="text-navy-900 font-semibold mt-0.5 block">
                    {complaint.description || "Public infrastructure issue reported."}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Location</span>
                  <span className="text-navy-900 font-semibold mt-0.5 block">
                    {complaint.address_hint || complaint.area_name || "Bengaluru Pilot"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Officer Completion Date</span>
                  <span className="text-navy-900 font-semibold mt-0.5 block">
                    {complaint.completion_requested_at
                      ? new Date(complaint.completion_requested_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recorded on repair upload"}
                  </span>
                  {complaint.completed_by && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {complaint.completed_by.designation} ({complaint.completed_by.employee_id})
                    </span>
                  )}
                </div>
              </div>

              {/* Before & After Photographs */}
              <BeforeAfterCompare images={complaint.image_records} category={complaint.category} />

              {/* Vote Tallies */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-civicTeal-50 border border-civicTeal-100 rounded-xl p-3">
                  <p className="text-2xl font-extrabold text-civicTeal-700">{ver.confirmed_count}</p>
                  <p className="text-xs text-civicTeal-700 font-medium">Completed Votes</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-2xl font-extrabold text-orange-700">{ver.disputed_count}</p>
                  <p className="text-xs text-orange-800 font-medium">Disputed Votes</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-2xl font-extrabold text-navy-900">{ver.confirm_percentage}%</p>
                  <p className="text-xs text-slate-600 font-medium">Confirmation Rate</p>
                </div>
              </div>

              {/* Voting Controls (Supporter-only, Single Vote Enforced on Backend) */}
              <div className="pt-3 border-t border-slate-200">
                {!user ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-50 border border-navy-100 rounded-xl p-3.5">
                    <p className="text-xs text-navy-900">
                      Only citizens who supported the original complaint can vote. Sign in to verify this repair.
                    </p>
                    <Link
                      to="/citizen-login"
                      className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800"
                    >
                      Citizen Sign In
                    </Link>
                  </div>
                ) : ver.user_has_voted ? (
                  <div className="bg-civicTeal-50 border border-civicTeal-200 rounded-xl p-3.5 text-xs font-semibold text-civicTeal-700 inline-flex items-center gap-2 w-full">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    You have already submitted your verification vote:{" "}
                    {ver.user_vote === "WORK_COMPLETED" ? "Yes, Work Completed" : "No, Issue Still Exists"}.
                  </div>
                ) : ver.user_is_eligible ? (
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-slate-700">
                      You supported this complaint prior to completion submission. Cast your verification vote:
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleVote("WORK_COMPLETED")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-sm font-bold shadow-sm transition"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Yes, Work Completed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote("ISSUE_STILL_EXISTS")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition"
                      >
                        <ThumbsDown className="w-4 h-4" /> No, Issue Still Exists
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Only citizens who supported the original complaint before completion was requested ({ver.eligible_supporters_count} eligible supporters) are allowed to vote.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Before & After Evidence (when not already shown inside Verify Work Completion card) */}
          {complaint.status !== "AWAITING_VERIFICATION" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-navy-900">Before & After Repair Evidence</h2>
                {complaint.completion_requested_at && (
                  <span className="text-xs text-slate-500">
                    Officer completion date:{" "}
                    {new Date(complaint.completion_requested_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              <BeforeAfterCompare images={complaint.image_records} category={complaint.category} />
            </div>
          )}

          {/* Verification Outcome Summary (for non-awaiting states such as Citizen Verified, Disputed, Reopened) */}
          {complaint.status !== "AWAITING_VERIFICATION" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-navy-900">
                    {complaint.status === "RESOLVED_VERIFIED"
                      ? "Resolved – Citizen Verified"
                      : complaint.status === "DISPUTED"
                      ? "Verification Disputed — Eligible for Reopening"
                      : "Community Verification Outcome"}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Only citizens who supported the original complaint before repair completion was requested can vote.
                  </p>
                </div>
                <StatusBadge status={complaint.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-civicTeal-50 border border-civicTeal-100 rounded-xl p-3">
                  <p className="text-2xl font-extrabold text-civicTeal-700">{ver.confirmed_count}</p>
                  <p className="text-xs text-civicTeal-700 font-medium">Completed Votes</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-2xl font-extrabold text-orange-700">{ver.disputed_count}</p>
                  <p className="text-xs text-orange-800 font-medium">Disputed Votes</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-2xl font-extrabold text-navy-900">{ver.confirm_percentage}%</p>
                  <p className="text-xs text-slate-600 font-medium">Approval Rate</p>
                </div>
              </div>

              {complaint.status === "DISPUTED" && user && (user.role === "officer" || user.role === "admin") && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-orange-800">
                    Citizens disputed this repair. Reopen the complaint to schedule corrective work.
                  </span>
                  <button
                    type="button"
                    onClick={handleReopen}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
                  >
                    Reopen Complaint
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Public Accountability Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-navy-900">Public Accountability Timeline</h2>
            <TimelineView items={complaint.timeline} />
          </div>
        </div>

        {/* Right Sidebar: Explainable Priority & Geo */}
        <div className="lg:col-span-4 space-y-6">
          {/* Explainable Priority Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-navy-900">Explainable Priority Score</h2>
              <PriorityBadge level={complaint.priority_level} score={complaint.priority_score} />
            </div>
            {complaint.priority_breakdown && (
              <>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {complaint.priority_breakdown.summary}
                </p>
                <div className="space-y-2.5">
                  {complaint.priority_breakdown.factors.map((f) => (
                    <div key={f.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">
                          {f.name} ({f.weight_pct}%)
                        </span>
                        <span className="font-bold text-navy-900">+{f.weighted_contribution}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-civicTeal-600 rounded-full"
                          style={{ width: `${Math.min(100, f.raw_score)}%` }}
                        />
                      </div>
                      {f.note && <p className="text-[11px] text-slate-500">{f.note}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Location Mini-Map */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-navy-900">Location & Jurisdiction</h2>
            <ComplaintMap
              complaints={[complaint]}
              center={[complaint.latitude, complaint.longitude]}
              zoom={15}
              height="220px"
            />
            <div className="text-xs text-slate-600 space-y-1">
              <p><strong>Coordinates:</strong> {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}</p>
              <p><strong>Routing Note:</strong> {complaint.routing_reason || "Standard pilot routing."}</p>
            </div>
          </div>

          {/* Related Historical Complaints */}
          {complaint.related_historical_complaints.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Nearby Related History
              </h2>
              <div className="space-y-2">
                {complaint.related_historical_complaints.map((rel) => (
                  <Link
                    key={rel.complaint_id}
                    to={`/complaints/${rel.complaint_id}`}
                    className="block p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs"
                  >
                    <div className="flex justify-between font-bold text-navy-900">
                      <span>{rel.reference_code}</span>
                      <span>{rel.distance_meters}m away</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">Status: {formatStatus(rel.status)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
