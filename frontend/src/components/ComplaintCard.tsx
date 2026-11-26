import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, MapPin, Repeat, ThumbsUp } from "lucide-react";
import { apiRequest, getCategoryFallbackPhoto, getImageUrl, isSampleDemoImage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ComplaintSummary } from "../types";
import { formatCategory, PriorityBadge, StatusBadge } from "./StatusBadge";

interface ComplaintCardProps {
  complaint: ComplaintSummary;
  view?: "grid" | "list";
  onSupported?: (complaintId: string, newCount: number, newScore: number, newLevel: ComplaintSummary["priority_level"]) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, view = "grid", onSupported }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "ok" | "err" | "auth" } | null>(null);
  const [imgSrc, setImgSrc] = useState<string>(
    getImageUrl(complaint.thumbnail_url) || getCategoryFallbackPhoto(complaint.category, "BEFORE")
  );

  const isSample = isSampleDemoImage(complaint.thumbnail_url || imgSrc);
  const dateLabel = complaint.created_at
    ? new Date(complaint.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const handleSupportClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setFeedback({ text: "Please sign in as a citizen to support this issue.", type: "auth" });
      return;
    }
    if (user.role !== "citizen") {
      setFeedback({ text: "Only authenticated citizen accounts can support complaints.", type: "err" });
      return;
    }
    if (complaint.user_has_supported || busy) return;

    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{
        complaint_id: string;
        support_count: number;
        priority_score: number;
        priority_level: ComplaintSummary["priority_level"];
      }>(`/api/complaints/${complaint.complaint_id}/support`, { method: "POST" });

      setFeedback({ text: "Support recorded! Priority updated.", type: "ok" });
      if (onSupported) {
        onSupported(complaint.complaint_id, res.support_count, res.priority_score, res.priority_level);
      }
    } catch (err: any) {
      setFeedback({ text: err.message || "Could not record support.", type: "err" });
    } finally {
      setBusy(false);
    }
  };

  const supportButton = (
    <button
      type="button"
      onClick={handleSupportClick}
      disabled={busy || complaint.user_has_supported}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
        complaint.user_has_supported
          ? "bg-civicTeal-50 text-civicTeal-700 border border-civicTeal-500/40 cursor-default"
          : "bg-navy-900 hover:bg-navy-800 text-white shadow-sm disabled:opacity-60"
      }`}
    >
      {complaint.user_has_supported ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" /> Supported ({complaint.support_count})
        </>
      ) : (
        <>
          <ThumbsUp className="w-3.5 h-3.5" /> {busy ? "Saving..." : `Support This Issue (${complaint.support_count})`}
        </>
      )}
    </button>
  );

  const feedbackBanner = feedback && (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium flex items-center justify-between gap-2 ${
        feedback.type === "ok"
          ? "bg-civicTeal-50 text-civicTeal-700 border border-civicTeal-200"
          : "bg-amber-50 text-amber-900 border border-amber-200"
      }`}
    >
      <span>{feedback.text}</span>
      {feedback.type === "auth" && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate("/citizen-login");
          }}
          className="px-2 py-0.5 rounded bg-navy-900 text-white font-semibold shrink-0"
        >
          Citizen Sign In
        </button>
      )}
    </div>
  );

  if (view === "list") {
    return (
      <div className="group bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-navy-200 transition-all">
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={`/complaints/${complaint.complaint_id}`} className="relative w-full sm:w-48 h-36 rounded-lg overflow-hidden bg-slate-100 shrink-0 block">
            <img
              src={imgSrc}
              alt={`${formatCategory(complaint.category)} - ${complaint.reference_code}`}
              onError={() => setImgSrc(getCategoryFallbackPhoto(complaint.category, "BEFORE"))}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <span className="absolute bottom-1.5 left-1.5 bg-slate-900/75 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              {isSample ? "Sample Photo" : "Uploaded Photo"}
            </span>
          </Link>
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/complaints/${complaint.complaint_id}`} className="text-xs font-bold tracking-wide text-navy-800 bg-navy-50 px-2 py-0.5 rounded hover:underline">
                    {complaint.reference_code}
                  </Link>
                  <span className="text-xs font-medium text-slate-600">{formatCategory(complaint.category)}</span>
                  {complaint.is_recurring && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                      <Repeat className="w-3 h-3" /> Recurring
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge level={complaint.priority_level} score={complaint.priority_score} />
                  <StatusBadge status={complaint.status} />
                </div>
              </div>
              <Link to={`/complaints/${complaint.complaint_id}`} className="block text-sm text-slate-700 hover:text-navy-900 line-clamp-2 mb-2">
                {complaint.description || "Public infrastructure issue reported."}
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-civicTeal-600 shrink-0" />
                  {complaint.address_hint || complaint.area_name || "Bengaluru Pilot"}
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5" /> {dateLabel}
                </span>
              </div>
              <div className="shrink-0">{supportButton}</div>
            </div>
            {feedbackBanner}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-navy-200 transition-all flex flex-col">
      <Link to={`/complaints/${complaint.complaint_id}`} className="relative h-48 bg-slate-100 overflow-hidden block">
        <img
          src={imgSrc}
          alt={`${formatCategory(complaint.category)} - ${complaint.reference_code}`}
          onError={() => setImgSrc(getCategoryFallbackPhoto(complaint.category, "BEFORE"))}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="text-xs font-bold tracking-wide text-white bg-navy-900/85 backdrop-blur-sm px-2.5 py-1 rounded-md">
            {complaint.reference_code}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <PriorityBadge level={complaint.priority_level} score={complaint.priority_score} />
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="text-[10px] font-medium text-white bg-slate-900/75 px-2 py-0.5 rounded">
            {isSample ? "Sample Demo Photo" : "Uploaded Photo"}
          </span>
        </div>
        {complaint.is_recurring && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-slate-950 shadow-sm">
              <Repeat className="w-3 h-3" /> Recurring Issue
            </span>
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-civicTeal-700 uppercase tracking-wider">
              {formatCategory(complaint.category)}
            </span>
            <StatusBadge status={complaint.status} />
          </div>
          <Link to={`/complaints/${complaint.complaint_id}`} className="block text-sm text-slate-700 hover:text-navy-900 line-clamp-2 mb-3">
            {complaint.description || "Public infrastructure complaint."}
          </Link>
        </div>

        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-civicTeal-600 shrink-0" />
              <span className="truncate">{complaint.address_hint || complaint.area_name || "Bengaluru"}</span>
            </span>
            <span className="shrink-0">{dateLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {supportButton}
            <Link to={`/complaints/${complaint.complaint_id}`} className="text-xs font-semibold text-navy-800 hover:underline">
              Details →
            </Link>
          </div>
          {feedbackBanner}
        </div>
      </div>
    </div>
  );
};
