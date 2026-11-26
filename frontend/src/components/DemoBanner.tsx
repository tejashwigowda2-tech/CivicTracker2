import React from "react";
import { Info } from "lucide-react";
import { isStaticDemoActive } from "../api/client";

export const DemoBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const staticMode = isStaticDemoActive();

  return (
    <div className={`bg-navy-50 border border-navy-100 text-navy-900 rounded-xl ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"} flex items-start gap-2.5`}>
      <Info className="w-4 h-4 text-navy-700 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <span className="font-semibold">
          {staticMode
            ? "Interactive Static Frontend Demo Mode (Backend Not Connected):"
            : "Independent Civic-Tech Prototype (Demo Data):"}
        </span>{" "}
        {staticMode
          ? "Changes are stored locally in your browser. Deploy the FastAPI backend and configure VITE_API_BASE_URL for live PostgreSQL/Supabase persistence. "
          : ""}
        Pilot zones, sample department queues, and demonstration officer records are simulated for evaluation.
        CivicTrack is not affiliated with BBMP, BESCOM, BWSSB, or any government body.
      </p>
    </div>
  );
};
