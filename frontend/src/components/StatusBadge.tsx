import React from "react";

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700 border-slate-300",
  UNDER_REVIEW: "bg-amber-50 text-amber-800 border-amber-200",
  ASSIGNED: "bg-navy-50 text-navy-800 border-navy-100",
  IN_PROGRESS: "bg-sky-50 text-sky-800 border-sky-200",
  AWAITING_VERIFICATION: "bg-teal-50 text-teal-800 border-teal-200",
  DISPUTED: "bg-orange-50 text-orange-800 border-orange-300",
  RESOLVED_VERIFIED: "bg-civicTeal-100 text-civicTeal-700 border-civicTeal-500/40",
  OVERDUE: "bg-red-50 text-red-700 border-red-300",
  REOPENED: "bg-orange-50 text-orange-800 border-orange-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-amber-100 text-amber-900 border border-amber-300",
  Low: "bg-slate-100 text-slate-700 border border-slate-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  potholes_road_damage: "Potholes & Road Damage",
  garbage_accumulation: "Garbage Accumulation",
  drainage_blockage: "Drainage Blockage",
};

export function formatCategory(cat: string): string {
  return (
    CATEGORY_LABELS[cat] ||
    cat
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  AWAITING_VERIFICATION: "Awaiting Citizen Verification",
  DISPUTED: "Disputed",
  RESOLVED_VERIFIED: "Citizen Verified",
  OVERDUE: "Overdue",
  REOPENED: "Reopened",
};

export function formatStatus(status: string): string {
  return (
    STATUS_LABELS[status] ||
    status
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {formatStatus(status)}
    </span>
  );
};

export const PriorityBadge: React.FC<{ level: string; score?: number }> = ({ level, score }) => {
  const cls = PRIORITY_STYLES[level] || PRIORITY_STYLES.Medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <span>{level}</span>
      {typeof score === "number" && <span className="opacity-90">({Math.round(score)})</span>}
    </span>
  );
};
