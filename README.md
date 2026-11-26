# CivicTrack — Report. Track. Verify. Improve.

**CivicTrack** is an independent, AI-assisted civic infrastructure complaint-management platform connecting citizens, department officers, and oversight administrators through transparent tracking, explainable prioritization, before-and-after repair evidence, and **Civic Issue Memory**.

> **Independence Notice:** CivicTrack is an independent demonstration prototype designed for future integration with civic authorities. It is **not** officially affiliated with BBMP, BESCOM, BWSSB, or any government body.

- **Live Frontend Demo (Netlify):** https://civictrack-portal-2026.netlify.app

---

## Core Innovations Implemented

1. **Civic Issue Memory (Recurring Infrastructure Detection):** Preserves resolved historical complaints permanently and links new nearby reports of the same category (`recurrence_links`), highlighting recurring hotspots and elevating priority.
2. **Evidence-Based Resolution & Citizen Verification:** Officers must upload after-repair photographs (`AFTER` evidence) before requesting closure. Only citizens who supported the complaint prior to completion submission can vote (`WORK_COMPLETED` vs `ISSUE_STILL_EXISTS`) to move the issue to `RESOLVED_VERIFIED` or `DISPUTED`.
3. **Intelligent Explainable Prioritisation (0–100):** Weighted scoring across Safety Severity (35%), Time Unresolved (20%), Community Support (20%), Recurrence History (15%), and Verified Location Context (10%) with an itemized explanation on every complaint page.
4. **Smart Duplicate Detection:** Haversine geographic + category + description matching warns citizens about nearby active reports and lets them support existing issues instead of creating duplicates.
5. **Public Accountability Timeline & Escalation Sweep:** Tracks every status transition and automatically marks SLA-breached complaints `OVERDUE` with internal escalation records and supervisor notifications.
6. **Quality-Based Officer Recognition:** Evaluates acknowledgement speed, verified resolution rate, citizen approval %, and recurrence rate rather than raw ticket closure counts.

---

## Transparency: Feature & Data Status

### 1. Fully Implemented Features
- Three role-separated portals (`Citizen`, `Restricted Department Officer`, `Administrator`) backed by FastAPI REST APIs, JWT auth, PBKDF2 password hashing, and server-side RBAC.
- Public citizen browsing, search, multi-facet filtering, sorting, Grid/List/Interactive Leaflet Map views, and dedicated complaint detail pages.
- Anonymous reporting (`reporter_id = null`) and confidential contact storage (excluded from all public APIs).
- Image upload validation (size/type/Pillow integrity check), side-by-side & interactive slider before/after comparison.
- Smart duplicate detection, explainable 0–100 priority scoring, hybrid routing, supporter-only verification rules, recurrence linking, SLA escalation checks, notifications, and audit logs.

### 2. Features Operating Using Sample / Demo Data
- **Bengaluru Pilot Zones & Boundaries:** Sample polygons/radii (`BLR-PILOT-IND`, `BLR-PILOT-KRM`, `BLR-PILOT-JYN`, `BLR-PILOT-WTF`) — clearly labelled as demonstration data, not official municipal GIS boundaries.
- **Department Queues & Jurisdictions:** Independent simulated queues (`ROADS-DEMO`, `SANITATION-DEMO`, `DRAINS-DEMO`, `UTILITY-DEMO`) and sample jurisdiction mappings.
- **Demonstration Accounts, Seed Complaints & Officer Recognition Badges:** 16 initial seeded complaints across all statuses, 17 real category-specific sample photographs (potholes, road repairs, waste accumulation, clogged & cleared drains), recurrence chains, and demo officer performance badges.
- **Local SQLite & Disk Storage Fallback:** Out-of-the-box local `civictrack_demo.db` and `backend/uploads/` when `DATABASE_URL` and `SUPABASE_*` env vars are unset.

### 3. Features Requiring External API Credentials (Optional)
- **Cloud Vision AI Classification:** Set `VISION_AI_PROVIDER=gemini` and `GEMINI_API_KEY` to enable Gemini Vision classification. Without credentials, CivicTrack automatically runs a clearly labelled **rule-based + Pillow visual heuristic fallback** (`mode: "heuristic_fallback"`) and never falsely claims ML inference.
- **Managed PostgreSQL & Supabase Storage:** Set `DATABASE_URL` (PostgreSQL/Supabase) and `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (and apply `backend/sql/schema.sql`).

### 4. Features Requiring Official Government Integration in Future Deployment
- Official municipal ward boundaries, authoritative road/utility asset ownership registries, single sign-on with government employee directories, and bidirectional municipal work-order APIs.

---

## Demonstration Login Credentials

| Role | Identifier | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@civictrack.demo` | `Admin@123` | Full governance, routing review, SLA & jurisdiction config |
| **Officer (Roads)** | `EMP-DEMO-101` | `Officer@123` | `ROADS-DEMO` • Indiranagar Pilot Zone |
| **Officer (Sanitation)** | `EMP-DEMO-102` | `Officer@123` | `SANITATION-DEMO` • Koramangala Pilot Zone |
| **Officer (Drains)** | `EMP-DEMO-103` | `Officer@123` | `DRAINS-DEMO` • Koramangala Pilot Zone |
| **Officer (Roads - Jyn)** | `EMP-DEMO-104` | `Officer@123` | `ROADS-DEMO` • Jayanagar Pilot Zone |
| **Citizen (Demo)** | `ananya@citizen.demo` / `rohan@citizen.demo` | `Citizen@123` | Support issues & cast eligible verification votes |

---

## Local Setup & Running

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Frontend (React + TypeScript + Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
```
- Application URL: `http://localhost:5173`

### 3. Running Automated Tests
```bash
backend\.venv\Scripts\pytest backend\tests\test_api.py -v
```

---

## Deployment Instructions

- **Database (Supabase PostgreSQL):** Execute `backend/sql/schema.sql` in the Supabase SQL Editor, create a public storage bucket (`civictrack-images`), and configure `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY`.
- **Backend (Render / Railway / Fly.io):** Deploy `backend/` with start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT` and set environment variables from `.env.example`.
- **Frontend (Vercel / Netlify):** Deploy `frontend/` with build command `npm run build`, output directory `dist`, and `VITE_API_BASE_URL` pointing to the deployed backend URL.
