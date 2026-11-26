import React from "react";
import { ShieldCheck, Lock, Repeat, FileCheck2, Sparkles } from "lucide-react";
import { DemoBanner } from "../components/DemoBanner";

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold text-navy-900">How CivicTrack Works</h1>
        <p className="text-base text-slate-600 leading-relaxed">
          CivicTrack is an independent AI-assisted civic infrastructure complaint platform built around
          transparency, explainable prioritization, before-and-after verification, and institutional memory.
        </p>
      </div>

      <DemoBanner />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2.5">
          <Sparkles className="w-6 h-6 text-navy-700" />
          <h2 className="font-bold text-lg text-navy-900">Explainable Risk-Based Prioritisation</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every complaint receives a 0–100 score using transparent configurable weights: Safety Severity (35%),
            Time Unresolved (20%), Community Support (20%), Recurrence History (15%), and Verified Location Context (10%).
            Citizens can inspect the exact score breakdown on every complaint detail page.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2.5">
          <FileCheck2 className="w-6 h-6 text-civicTeal-600" />
          <h2 className="font-bold text-lg text-navy-900">Two-Stage Verified Closure</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            An officer cannot silently close an issue. They must upload after-repair photographs to enter
            Awaiting Verification. Only citizens who supported the complaint before repair completion was requested
            can vote to confirm or dispute the work.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2.5">
          <Repeat className="w-6 h-6 text-amber-600" />
          <h2 className="font-bold text-lg text-navy-900">Civic Issue Memory</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Past resolved complaints remain in the archive permanently. If a similar issue is reported near a
            previously repaired spot, CivicTrack links them so recurring failures are visible to citizens and admins.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2.5">
          <ShieldCheck className="w-6 h-6 text-navy-800" />
          <h2 className="font-bold text-lg text-navy-900">Hybrid Jurisdiction Routing</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sample jurisdiction mappings route complaints by category and pilot area. Ambiguous or cross-agency
            cases are routed to Administrator Review rather than blindly assigned.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-navy-900">Nine CivicTrack Differentiators & Architecture Transparency</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { t: "1. AI-Assisted Classification", d: "Supports Gemini Vision API when configured; otherwise uses a clearly labelled rule-based + Pillow heuristic fallback (never claims fake ML accuracy)." },
            { t: "2. Smart Duplicate Detection", d: "Haversine geographic radius + category + description token similarity checks nearby active complaints before submission." },
            { t: "3. Hybrid Department Routing", d: "Routes using configurable Bengaluru sample pilot jurisdictions and sends ambiguous cases to Administrator Review." },
            { t: "4. Risk-Based Priority Scoring", d: "Explainable 0–100 weighted formula: Safety (35%), Time Unresolved (20%), Support (20%), Recurrence (15%), Verified Geo (10%)." },
            { t: "5. Citizen-Verified Completion", d: "Requires officer after-repair photo upload and restricts verification voting to original supporters before completion." },
            { t: "6. Civic Issue Memory", d: "Links new reports near previously resolved issues of the same category to surface recurring infrastructure failures." },
            { t: "7. Public Accountability Timeline", d: "Records every status transition, verification vote, escalation, and admin decision transparently." },
            { t: "8. Quality-Based Officer Recognition", d: "Evaluates acknowledgement speed, verified resolution rate, citizen approval, and low recurrence (demo metrics labelled)." },
            { t: "9. Overdue Complaint Escalation", d: "Automated SLA checks flag overdue issues internally and notify supervisors without claiming external government enforcement." },
          ].map((item) => (
            <div key={item.t} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-navy-900">{item.t}</p>
              <p className="text-slate-600 leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-xl font-bold text-navy-900">About CivicTrack</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Developed as a national-level civic-tech engineering demonstration, CivicTrack bridges citizens, field
          officers, and oversight administrators on a unified database without fabricating official municipal
          affiliations.
        </p>
      </section>

      <section id="privacy" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-civicTeal-600" /> Privacy & Anonymous Reporting
        </h2>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
          <li>Anonymous reporting requires no account and stores <code>reporter_id = null</code>.</li>
          <li>Confidential follow-up contacts and internal officer remarks are excluded from all public API responses.</li>
          <li>Location is captured solely during complaint submission — never via background tracking.</li>
        </ul>
      </section>

      <section id="terms" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-xl font-bold text-navy-900">Terms & Independence Notice</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          CivicTrack is an independent software platform designed for future departmental integration. Demonstration
          zones in Bengaluru, sample queues (ROADS-DEMO, SANITATION-DEMO, DRAINS-DEMO), and demonstration officers
          are simulated and do not represent official BBMP, BESCOM, or BWSSB operations.
        </p>
      </section>

      <section id="contact" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2">
        <h2 className="text-xl font-bold text-navy-900">Contact & Pilot Feedback</h2>
        <p className="text-sm text-slate-600">
          For hackathon review or pilot architecture inquiries, reach the CivicTrack engineering team via the
          administrator demonstration portal.
        </p>
      </section>
    </div>
  );
};
