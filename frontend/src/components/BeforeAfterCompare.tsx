import React, { useState } from "react";
import { Columns, SlidersHorizontal } from "lucide-react";
import { getCategoryFallbackPhoto, getImageUrl, isSampleDemoImage } from "../api/client";

interface ImageRecord {
  image_id: string;
  image_url: string;
  image_type: "BEFORE" | "AFTER";
  uploaded_at?: string | null;
}

export const BeforeAfterCompare: React.FC<{ images: ImageRecord[]; category?: string }> = ({
  images,
  category = "potholes_road_damage",
}) => {
  const before = images.find((i) => i.image_type === "BEFORE");
  const after = images.find((i) => i.image_type === "AFTER");
  const [mode, setMode] = useState<"side_by_side" | "slider">("side_by_side");
  const [sliderPos, setSliderPos] = useState(50);

  const [beforeUrl, setBeforeUrl] = useState(
    before ? getImageUrl(before.image_url) : getCategoryFallbackPhoto(category, "BEFORE")
  );
  const [afterUrl, setAfterUrl] = useState(
    after ? getImageUrl(after.image_url) : ""
  );

  // Sync if parent refreshes after upload
  React.useEffect(() => {
    if (before) setBeforeUrl(getImageUrl(before.image_url));
    if (after) setAfterUrl(getImageUrl(after.image_url));
  }, [before?.image_url, after?.image_url]);

  if (!before && !after) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
        No photographs attached to this complaint yet.
      </div>
    );
  }

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  const beforeLabel = isSampleDemoImage(before?.image_url) ? "Sample Demonstration Photo" : "Citizen-Uploaded Photo";
  const afterLabel = isSampleDemoImage(after?.image_url) ? "Sample Demonstration Photo" : "Officer-Uploaded Evidence";

  return (
    <div className="space-y-3">
      {before && after && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-600 font-medium">
            Compare original report photograph against repair evidence
          </p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("side_by_side")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                mode === "side_by_side" ? "bg-white text-navy-900 shadow-sm" : "text-slate-600"
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Side by Side
            </button>
            <button
              type="button"
              onClick={() => setMode("slider")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                mode === "slider" ? "bg-white text-navy-900 shadow-sm" : "text-slate-600"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Interactive Slider
            </button>
          </div>
        </div>
      )}

      {mode === "slider" && before && after ? (
        <div className="space-y-2">
          <div className="relative w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-200 select-none bg-slate-900">
            <img
              src={afterUrl}
              alt="After repair"
              onError={() => setAfterUrl(getCategoryFallbackPhoto(category, "AFTER"))}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
              <img
                src={beforeUrl}
                alt="Before repair"
                onError={() => setBeforeUrl(getCategoryFallbackPhoto(category, "BEFORE"))}
                className="w-full h-full object-cover max-w-none"
                style={{ width: "100vw", maxWidth: "100%" }}
              />
            </div>
            <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow" style={{ left: `${sliderPos}%` }} />
            <span className="absolute top-3 left-3 bg-navy-900/85 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
              BEFORE
            </span>
            <span className="absolute top-3 right-3 bg-civicTeal-700/90 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
              AFTER REPAIR
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            aria-label="Before and after comparison slider"
            className="w-full accent-civicTeal-600 cursor-pointer"
          />
        </div>
      ) : (
        <div className={`grid gap-4 ${before && after ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {before && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-navy-900 uppercase tracking-wide">Original Report (Before)</span>
                <span className="text-[11px] font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">{beforeLabel}</span>
              </div>
              <img
                src={beforeUrl}
                alt="Original issue"
                onError={() => setBeforeUrl(getCategoryFallbackPhoto(category, "BEFORE"))}
                className="w-full h-64 object-cover"
              />
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
                Recorded: {fmtDate(before.uploaded_at)}
              </div>
            </div>
          )}
          {after ? (
            <div className="border border-civicTeal-500/40 rounded-xl overflow-hidden bg-white">
              <div className="px-3 py-2 bg-civicTeal-50 border-b border-civicTeal-100 flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-civicTeal-700 uppercase tracking-wide">Repair Evidence (After)</span>
                <span className="text-[11px] font-medium text-civicTeal-700 bg-civicTeal-100 px-2 py-0.5 rounded">{afterLabel}</span>
              </div>
              <img
                src={afterUrl}
                alt="After repair"
                onError={() => setAfterUrl(getCategoryFallbackPhoto(category, "AFTER"))}
                className="w-full h-64 object-cover"
              />
              <div className="px-3 py-1.5 bg-civicTeal-50/50 border-t border-civicTeal-100 text-[11px] text-civicTeal-700">
                Uploaded: {fmtDate(after.uploaded_at)}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50">
              <p className="text-sm font-medium text-slate-700">Awaiting Repair Evidence</p>
              <p className="text-xs text-slate-500 mt-1">
                Officers must upload an after-work photograph before requesting completion verification.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
