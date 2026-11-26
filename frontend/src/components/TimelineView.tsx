import React from "react";
import { AlertTriangle, CheckCircle2, Clock, Wrench } from "lucide-react";
import { formatStatus } from "./StatusBadge";

interface TimelineEntry {
  history_id: string;
  old_status?: string | null;
  new_status: string;
  remarks?: string | null;
  changed_at?: string | null;
}

export const TimelineView: React.FC<{ items: TimelineEntry[] }> = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-500">No timeline events recorded yet.</p>;
  }

  const getIcon = (status: string) => {
    if (status === "RESOLVED_VERIFIED") return <CheckCircle2 className="w-4 h-4 text-civicTeal-600" />;
    if (status === "OVERDUE" || status === "DISPUTED") return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (status === "IN_PROGRESS" || status === "AWAITING_VERIFICATION") return <Wrench className="w-4 h-4 text-navy-700" />;
    return <Clock className="w-4 h-4 text-slate-600" />;
  };

  return (
    <ol className="relative border-l-2 border-slate-200 ml-3 space-y-5 my-2">
      {items.map((item) => (
        <li key={item.history_id} className="ml-6 relative">
          <span className="absolute -left-[33px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-slate-200 shadow-sm">
            {getIcon(item.new_status)}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-navy-900">
              {formatStatus(item.new_status)}
            </span>
            {item.changed_at && (
              <time className="text-xs text-slate-500">
                {new Date(item.changed_at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            )}
          </div>
          {item.remarks && (
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{item.remarks}</p>
          )}
        </li>
      ))}
    </ol>
  );
};
