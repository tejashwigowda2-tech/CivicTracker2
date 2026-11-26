import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Compass,
  EyeOff,
  Lock,
  MapPin,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { apiRequest, getImageUrl } from "../api/client";
import { ComplaintMap } from "../components/ComplaintMap";
import { DemoBanner } from "../components/DemoBanner";
import { formatCategory, StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { Area, ComplaintCategory, ComplaintSummary } from "../types";

interface AiResult {
  suggested_category: string;
  severity_hint: string;
  confidence: number;
  mode: string;
  reasoning: string;
  is_simulated_fallback: boolean;
}

interface RoutingPreview {
  area_id: string | null;
  area_name: string;
  department_name: string | null;
  department_code: string | null;
  confidence: number;
  requires_admin_review: boolean;
  reason: string;
}

interface DuplicateMatch {
  complaint_id: string;
  reference_code: string;
  category: string;
  description: string | null;
  address_hint: string | null;
  status: string;
  distance_meters: number;
  support_count: number;
  thumbnail_url: string | null;
}

export const ReportIssuePage: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [category, setCategory] = useState("potholes_road_damage");
  const [description, setDescription] = useState("");
  const [addressHint, setAddressHint] = useState("");
  const [latitude, setLatitude] = useState(12.9784);
  const [longitude, setLongitude] = useState(77.6408);
  const [anonymous, setAnonymous] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [confidentialContact, setConfidentialContact] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [routingPreview, setRoutingPreview] = useState<RoutingPreview | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [dupDismissed, setDupDismissed] = useState(false);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedComplaint, setSubmittedComplaint] = useState<ComplaintSummary | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ categories: ComplaintCategory[] }>("/api/categories")
      .then((res) => {
        setCategories(res.categories);
        if (res.categories.length > 0) setCategory(res.categories[0].category_key);
      })
      .catch(() => {});
    apiRequest<{ areas: Area[] }>("/api/areas")
      .then((res) => setAreas(res.areas))
      .catch(() => {});
  }, []);

  // Refresh Routing preview whenever category or coords change
  useEffect(() => {
    apiRequest<RoutingPreview>("/api/routing/suggest", {
      method: "POST",
      body: JSON.stringify({ category, latitude, longitude }),
    })
      .then(setRoutingPreview)
      .catch(() => {});
  }, [category, latitude, longitude]);

  // Check smart duplicates whenever coords or category change
  useEffect(() => {
    setDupDismissed(false);
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      category,
      description,
    });
    apiRequest<{ duplicate_detected: boolean; matches: DuplicateMatch[] }>(
      `/api/complaints/nearby?${params.toString()}`
    )
      .then((res) => setDuplicates(res.matches || []))
      .catch(() => setDuplicates([]));
  }, [latitude, longitude, category]);

  const runClassification = async (file: File | null, desc: string) => {
    setAiLoading(true);
    try {
      const form = new FormData();
      form.append("description", desc);
      if (file) form.append("image", file);
      const res = await apiRequest<AiResult>("/api/ai/classify", {
        method: "POST",
        body: form,
      });
      setAiResult(res);
      if (res.suggested_category) {
        setCategory(res.suggested_category);
      }
    } catch {
      // ignore optional suggestion errors
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    runClassification(f, description);
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus("Browser geolocation unavailable; please click on the map to set coordinates.");
      return;
    }
    setGpsStatus("Capturing GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setGpsStatus("GPS coordinates captured at submission time only.");
      },
      () => {
        setGpsStatus("Could not access GPS permission; click on the map or select a pilot zone below.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSupportExisting = async (complaintId: string) => {
    if (!user) {
      setSupportMessage("Please sign in as a citizen first to support an existing complaint.");
      return;
    }
    try {
      const res = await apiRequest<{ support_count: number }>(`/api/complaints/${complaintId}/support`, {
        method: "POST",
      });
      setSupportMessage(`Supported existing complaint! Community support count is now ${res.support_count}.`);
      setDuplicates((prev) =>
        prev.map((m) => (m.complaint_id === complaintId ? { ...m, support_count: res.support_count } : m))
      );
    } catch (err: any) {
      setSupportMessage(err.message || "Could not add support.");
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("category", category);
      form.append("latitude", String(latitude));
      form.append("longitude", String(longitude));
      form.append("description", description);
      form.append("address_hint", addressHint || routingPreview?.area_name || "");
      if (routingPreview?.area_id) form.append("area_id", routingPreview.area_id);
      form.append("anonymous", String(anonymous));
      form.append("is_confidential", String(isConfidential));
      if (isConfidential && confidentialContact) {
        form.append("confidential_contact", confidentialContact);
      }
      if (imageFile) {
        form.append("image", imageFile);
      }
      const created = await apiRequest<ComplaintSummary>("/api/complaints", {
        method: "POST",
        body: form,
      });
      setSubmittedComplaint(created);
      setShowPreview(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedComplaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl border border-civicTeal-500/40 shadow-md p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-civicTeal-100 text-civicTeal-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-civicTeal-700">
              Complaint Registered
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1">
              {submittedComplaint.reference_code}
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Save this unique reference number to track timeline updates, repair evidence, and citizen verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Category</span>
              <span className="font-semibold text-navy-900">{formatCategory(submittedComplaint.category)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Assigned Queue</span>
              <span className="font-semibold text-navy-900">
                {submittedComplaint.department_name || "Administrator Routing Review"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Calculated Priority</span>
              <span className="font-semibold text-navy-900">
                {submittedComplaint.priority_level} ({submittedComplaint.priority_score}/100)
              </span>
            </div>
          </div>

          {submittedComplaint.is_recurring && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-900">
              <strong>Civic Issue Memory Activated:</strong> This location matches previous infrastructure reports and has been linked for recurrence tracking.
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to={`/complaints/${submittedComplaint.complaint_id}`}
              className="px-5 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 transition"
            >
              View Public Tracking Page
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedComplaint(null);
                setDescription("");
                setImageFile(null);
                setImagePreview(null);
                setAiResult(null);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">Report a Public Infrastructure Issue</h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit photographic evidence and coordinates. Anonymous reporting is supported without an account.
        </p>
      </div>

      <DemoBanner compact />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Photo Upload & AI Assist */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-civicTeal-600" /> 1. Photograph Evidence
              </label>
              <span className="text-xs text-slate-500">JPG, PNG, WEBP up to 5MB</span>
            </div>

            <label className="block border-2 border-dashed border-slate-300 hover:border-civicTeal-600 rounded-xl p-5 text-center cursor-pointer transition bg-slate-50">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
              {imagePreview ? (
                <img src={imagePreview} alt="Upload preview" className="max-h-56 mx-auto rounded-lg object-cover" />
              ) : (
                <div className="space-y-1.5 py-3">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">Click to upload or capture an issue photograph</p>
                  <p className="text-xs text-slate-500">Helps officers verify severity and compare after repair</p>
                </div>
              )}
            </label>

            {aiLoading && (
              <p className="text-xs text-civicTeal-700 font-medium">Running classification suggestion...</p>
            )}

            {aiResult && (
              <div className="bg-navy-50 border border-navy-100 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy-900 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-civicTeal-600" />
                    {aiResult.is_simulated_fallback
                      ? "Rule-Based Fallback Suggestion"
                      : `AI Vision Classification (${aiResult.mode})`}
                  </span>
                  <span className="font-semibold text-civicTeal-700">
                    {Math.round(aiResult.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-slate-700">
                  Suggested: <strong>{formatCategory(aiResult.suggested_category)}</strong> • Severity hint:{" "}
                  <strong>{aiResult.severity_hint}</strong>
                </p>
                <p className="text-slate-600">{aiResult.reasoning}</p>
              </div>
            )}
          </div>

          {/* 2. Category & Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-navy-900 mb-2">2. Confirm Issue Category</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {categories.map((cat) => (
                  <button
                    key={cat.category_key}
                    type="button"
                    onClick={() => setCategory(cat.category_key)}
                    className={`p-3 rounded-xl border text-left transition ${
                      category === cat.category_key
                        ? "border-civicTeal-600 bg-civicTeal-50 text-navy-900 ring-1 ring-civicTeal-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-bold">{cat.display_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">SLA: {cat.default_sla_hours}h</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-navy-900 mb-1.5">
                Description <span className="font-normal text-slate-500">(optional, improves routing & safety score)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description.trim().length > 4) runClassification(imageFile, description);
                }}
                placeholder="Describe safety hazards, landmarks, or duration of the issue..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civicTeal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-navy-900 mb-1.5">Approximate Street / Landmark</label>
              <input
                type="text"
                value={addressHint}
                onChange={(e) => setAddressHint(e.target.value)}
                placeholder="e.g., 100 Feet Road near 12th Main, Indiranagar"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-civicTeal-600"
              />
            </div>
          </div>

          {/* 3. Privacy Options */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-navy-700" /> 3. Reporter Privacy & Confidentiality
            </h2>
            <p className="text-xs text-slate-600">
              Public complaints never expose citizen names, phone numbers, or email addresses. Location is captured only at submission.
            </p>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="mt-1 accent-civicTeal-600"
              />
              <div>
                <span className="text-sm font-semibold text-navy-900 inline-flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-slate-600" /> Report Anonymously
                </span>
                <p className="text-xs text-slate-500">
                  Stores no reporter account link (reporter_id remains null). Works without signing in.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="mt-1 accent-civicTeal-600"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-navy-900">Confidential Follow-Up Contact</span>
                <p className="text-xs text-slate-500">
                  Optionally provide private contact details stored strictly outside public APIs.
                </p>
                {isConfidential && (
                  <input
                    type="text"
                    value={confidentialContact}
                    onChange={(e) => setConfidentialContact(e.target.value)}
                    placeholder="Private email or phone (never shown publicly)"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Right Location, Routing & Duplicate Detection Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* Location Picker */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-civicTeal-600" /> Location Selection
              </h2>
              <button
                type="button"
                onClick={captureGPS}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition"
              >
                <Compass className="w-3.5 h-3.5" /> Capture My GPS
              </button>
            </div>
            {gpsStatus && <p className="text-xs text-civicTeal-700">{gpsStatus}</p>}

            {/* Quick pilot zone presets */}
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <button
                  key={a.area_id}
                  type="button"
                  onClick={() => {
                    if (a.boundary_data) {
                      setLatitude(a.boundary_data.center_lat);
                      setLongitude(a.boundary_data.center_lng);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-navy-50 text-[11px] font-medium text-slate-700"
                >
                  {a.area_name.replace(" (Demo)", "")}
                </button>
              ))}
            </div>

            <ComplaintMap
              areas={areas}
              height="270px"
              center={[latitude, longitude]}
              zoom={13}
              pickerMode
              pickedCoords={[latitude, longitude]}
              onPickCoords={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-500 block mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Smart Duplicate Detection Alert */}
          {duplicates.length > 0 && !dupDismissed && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-950">Smart Duplicate Detection</h3>
                  <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                    A similar issue has already been reported nearby. Support the existing complaint instead of creating a duplicate.
                  </p>
                </div>
              </div>
              {supportMessage && (
                <div className="bg-white border border-amber-200 rounded-lg p-2 text-xs text-navy-900 font-medium">
                  {supportMessage}
                </div>
              )}
              <div className="space-y-2.5">
                {duplicates.slice(0, 2).map((m) => (
                  <div key={m.complaint_id} className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-navy-900">
                        {m.reference_code} • {m.distance_meters}m away
                      </span>
                      <StatusBadge status={m.status} />
                    </div>
                    {m.thumbnail_url && (
                      <img src={getImageUrl(m.thumbnail_url)} alt={m.reference_code} className="w-full h-24 object-cover rounded" />
                    )}
                    <p className="text-xs text-slate-600 line-clamp-2">{m.description || m.address_hint}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/complaints/${m.complaint_id}`}
                        className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                      >
                        View Existing Complaint
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleSupportExisting(m.complaint_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-civicTeal-600 text-white text-xs font-semibold hover:bg-civicTeal-700"
                      >
                        <ThumbsUp className="w-3 h-3" /> Support Existing ({m.support_count})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDupDismissed(true)}
                className="w-full py-1.5 text-xs font-semibold text-amber-900 hover:underline"
              >
                Continue with New Complaint Anyway
              </button>
            </div>
          )}

          {/* Hybrid Routing Preview */}
          {routingPreview && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hybrid Jurisdiction Routing
                </span>
                <span className="text-xs font-semibold text-civicTeal-700">
                  {Math.round(routingPreview.confidence * 100)}% match
                </span>
              </div>
              <p className="text-sm font-bold text-navy-900">
                {routingPreview.department_name || "Administrator Routing Review"}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">{routingPreview.reason}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="w-full py-3.5 rounded-xl bg-civicTeal-600 hover:bg-civicTeal-700 text-white font-bold text-sm shadow-sm transition"
          >
            Review & Preview Submission
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-navy-900">Confirm Complaint Submission</h3>
            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><strong>Category:</strong> {formatCategory(category)}</p>
              <p><strong>Coordinates:</strong> {latitude}, {longitude}</p>
              <p><strong>Location Hint:</strong> {addressHint || routingPreview?.area_name || "Specified on map"}</p>
              <p><strong>Suggested Queue:</strong> {routingPreview?.department_name || "Administrator Review"}</p>
              <p><strong>Privacy Mode:</strong> {anonymous ? "Anonymous (no account linked)" : user ? `Authenticated (${user.full_name} — hidden publicly)` : "Public Guest Submission"}</p>
              {description && <p><strong>Description:</strong> {description}</p>}
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-civicTeal-600 hover:bg-civicTeal-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
