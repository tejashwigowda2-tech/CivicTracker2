import type { Area, ComplaintCategory, ComplaintDetail, UserSummary } from "../types";

const PHOTO_POTHOLE_1 = "/demo-photos/pothole_1.jpg";
const PHOTO_POTHOLE_2 = "/demo-photos/pothole_2.jpg";
const PHOTO_POTHOLE_3 = "/demo-photos/pothole_3.jpg";
const PHOTO_POTHOLE_4 = "/demo-photos/pothole_4.jpg";
const PHOTO_ROAD_REPAIR_1 = "/demo-photos/road_repair_1.jpg";
const PHOTO_ROAD_REPAIR_2 = "/demo-photos/road_repair_2.jpg";
const PHOTO_ROAD_AFTER_CLEAN = "/demo-photos/road_after_clean.jpg";

const PHOTO_GARBAGE_1 = "/demo-photos/garbage_1.jpg";
const PHOTO_GARBAGE_2 = "/demo-photos/garbage_2.jpg";
const PHOTO_GARBAGE_3 = "/demo-photos/garbage_3.jpg";
const PHOTO_GARBAGE_AFTER_1 = "/demo-photos/garbage_after_1.jpg";
const PHOTO_GARBAGE_AFTER_2 = "/demo-photos/garbage_after_2.jpg";

const PHOTO_DRAIN_1 = "/demo-photos/drain_1.jpg";
const PHOTO_DRAIN_2 = "/demo-photos/drain_2.jpg";
const PHOTO_DRAIN_3 = "/demo-photos/drain_3.jpg";
const PHOTO_DRAIN_AFTER_1 = "/demo-photos/drain_after_1.jpg";
const PHOTO_DRAIN_AFTER_2 = "/demo-photos/drain_after_2.jpg";

const STORAGE_KEY = "civictrack_static_demo_v2";

const DEMO_AREAS: Area[] = [
  {
    area_id: "area-ind",
    area_name: "Indiranagar Pilot Zone (Demo)",
    ward_code: "BLR-PILOT-IND",
    is_active: true,
    boundary_data: {
      center_lat: 12.9784,
      center_lng: 77.6408,
      radius_meters: 2400,
      verified_zone_tier: "high_footfall_pilot",
      is_sample_boundary: true,
      polygon: [[12.967, 77.628], [12.967, 77.654], [12.990, 77.654], [12.990, 77.628]],
    },
  },
  {
    area_id: "area-krm",
    area_name: "Koramangala Pilot Zone (Demo)",
    ward_code: "BLR-PILOT-KRM",
    is_active: true,
    boundary_data: {
      center_lat: 12.9352,
      center_lng: 77.6245,
      radius_meters: 2400,
      verified_zone_tier: "high_footfall_pilot",
      is_sample_boundary: true,
      polygon: [[12.923, 77.611], [12.923, 77.638], [12.947, 77.638], [12.947, 77.611]],
    },
  },
  {
    area_id: "area-jyn",
    area_name: "Jayanagar Pilot Zone (Demo)",
    ward_code: "BLR-PILOT-JYN",
    is_active: true,
    boundary_data: {
      center_lat: 12.9299,
      center_lng: 77.5824,
      radius_meters: 2400,
      verified_zone_tier: "urban_pilot",
      is_sample_boundary: true,
      polygon: [[12.918, 77.569], [12.918, 77.596], [12.942, 77.596], [12.942, 77.569]],
    },
  },
  {
    area_id: "area-wtf",
    area_name: "Whitefield Pilot Zone (Demo)",
    ward_code: "BLR-PILOT-WTF",
    is_active: true,
    boundary_data: {
      center_lat: 12.9698,
      center_lng: 77.7500,
      radius_meters: 2800,
      verified_zone_tier: "urban_pilot",
      is_sample_boundary: true,
      polygon: [[12.955, 77.734], [12.955, 77.766], [12.985, 77.766], [12.985, 77.734]],
    },
  },
];

const DEMO_CATEGORIES: ComplaintCategory[] = [
  {
    category_id: "cat-1",
    category_key: "potholes_road_damage",
    display_name: "Potholes & Road Damage",
    description: "Damaged asphalt, road craters, sunken manholes, and carriageway hazards.",
    base_safety_severity: 78,
    default_sla_hours: 48,
    is_active: true,
  },
  {
    category_id: "cat-2",
    category_key: "garbage_accumulation",
    display_name: "Garbage Accumulation",
    description: "Uncollected waste piles, overflowing bins, and illegal roadside dumping.",
    base_safety_severity: 58,
    default_sla_hours: 36,
    is_active: true,
  },
  {
    category_id: "cat-3",
    category_key: "drainage_blockage",
    display_name: "Drainage Blockage",
    description: "Clogged stormwater drains, sewage overflow, and street waterlogging.",
    base_safety_severity: 74,
    default_sla_hours: 48,
    is_active: true,
  },
];

const DEMO_USERS: Record<string, { user: UserSummary; password: string }> = {
  "ananya@citizen.demo": {
    password: "Citizen@123",
    user: { user_id: "u-cit-1", full_name: "Ananya Rao", email: "ananya@citizen.demo", role: "citizen" },
  },
  "rohan@citizen.demo": {
    password: "Citizen@123",
    user: { user_id: "u-cit-2", full_name: "Rohan Deshmukh", email: "rohan@citizen.demo", role: "citizen" },
  },
  "meera@citizen.demo": {
    password: "Citizen@123",
    user: { user_id: "u-cit-3", full_name: "Meera Krishnan", email: "meera@citizen.demo", role: "citizen" },
  },
  "EMP-DEMO-101": {
    password: "Officer@123",
    user: {
      user_id: "u-off-1",
      full_name: "Vikram Shetty (Demo Officer)",
      email: "vikram.roads@civictrack.demo",
      role: "officer",
      employee_id: "EMP-DEMO-101",
      department_id: "dept-roads",
      department_name: "Road & Carriageway Maintenance Queue (Demo)",
      assigned_area_id: "area-ind",
      assigned_area_name: "Indiranagar Pilot Zone (Demo)",
      designation: "Assistant Road Engineer (Demo)",
    },
  },
  "EMP-DEMO-102": {
    password: "Officer@123",
    user: {
      user_id: "u-off-2",
      full_name: "Deepa Kulkarni (Demo Officer)",
      email: "deepa.sanitation@civictrack.demo",
      role: "officer",
      employee_id: "EMP-DEMO-102",
      department_id: "dept-waste",
      department_name: "Solid Waste & Street Sanitation Queue (Demo)",
      assigned_area_id: "area-krm",
      assigned_area_name: "Koramangala Pilot Zone (Demo)",
      designation: "Sanitation Supervisor (Demo)",
    },
  },
  "EMP-DEMO-103": {
    password: "Officer@123",
    user: {
      user_id: "u-off-3",
      full_name: "Arjun Menon (Demo Officer)",
      email: "arjun.drains@civictrack.demo",
      role: "officer",
      employee_id: "EMP-DEMO-103",
      department_id: "dept-drain",
      department_name: "Stormwater & Sewerage Maintenance Queue (Demo)",
      assigned_area_id: "area-krm",
      assigned_area_name: "Koramangala Pilot Zone (Demo)",
      designation: "Drainage Maintenance Officer (Demo)",
    },
  },
  "admin@civictrack.demo": {
    password: "Admin@123",
    user: { user_id: "u-adm-1", full_name: "Priya Nair (Demo Admin)", email: "admin@civictrack.demo", role: "admin" },
  },
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400 * 1000).toISOString();
}

interface SupportEntry {
  user_id: string;
  created_at: string;
}

interface VoteEntry {
  user_id: string;
  vote: "WORK_COMPLETED" | "ISSUE_STILL_EXISTS";
  created_at: string;
}

interface DemoStore {
  complaints: ComplaintDetail[];
  supports: Record<string, SupportEntry[]>;
  votes: Record<string, VoteEntry[]>;
  users: Record<string, { user: UserSummary; password: string }>;
  currentUser: UserSummary | null;
}

function buildInitialStore(): DemoStore {
  const makeBreakdown = (score: number, level: "Critical" | "High" | "Medium" | "Low", summary: string, recScore = 0) => ({
    summary,
    score,
    level,
    factors: [
      { name: "Safety Severity", weight_pct: 35, raw_score: 78, weighted_contribution: 27.3 },
      { name: "Time Unresolved", weight_pct: 20, raw_score: 55, weighted_contribution: 11.0 },
      { name: "Community Support", weight_pct: 20, raw_score: 40, weighted_contribution: 8.0 },
      { name: "Recurrence History", weight_pct: 15, raw_score: recScore, weighted_contribution: Number((recScore * 0.15).toFixed(1)) },
      { name: "Location Risk (Verified Geo)", weight_pct: 10, raw_score: 75, weighted_contribution: 7.5, note: "Verified within demonstration pilot zone." },
    ],
  });

  const complaints: ComplaintDetail[] = [
    {
      complaint_id: "c-0001",
      reference_code: "CT-2026-0001",
      category: "potholes_road_damage",
      description: "Collapsed road surface cavity near 100 Feet Road & 12th Main junction causing two-wheeler swerving.",
      latitude: 12.9781,
      longitude: 77.6405,
      address_hint: "100 Feet Road, 12th Main Junction, Indiranagar (Demo)",
      area_id: "area-ind",
      area_name: "Indiranagar Pilot Zone (Demo)",
      department_id: "dept-roads",
      department_name: "Road & Carriageway Maintenance Queue (Demo)",
      department_code: "ROADS-DEMO",
      priority_score: 61.5,
      priority_level: "High",
      status: "RESOLVED_VERIFIED",
      anonymous: false,
      is_confidential: false,
      support_count: 3,
      user_has_supported: false,
      before_images: [PHOTO_POTHOLE_1],
      after_images: [PHOTO_ROAD_REPAIR_1],
      thumbnail_url: PHOTO_POTHOLE_1,
      completion_requested_at: daysAgoIso(44),
      completed_by: { employee_id: "EMP-DEMO-101", designation: "Assistant Road Engineer (Demo)", department_name: "Road & Carriageway Maintenance Queue (Demo)" },
      created_at: daysAgoIso(45),
      resolved_at: daysAgoIso(43),
      is_recurring: true,
      recurrence_count: 1,
      priority_breakdown: makeBreakdown(61.5, "High", "Historical complaint verified as resolved by original supporters.", 0),
      image_records: [
        { image_id: "img-1a", image_url: PHOTO_POTHOLE_1, image_type: "BEFORE", uploaded_at: daysAgoIso(45) },
        { image_id: "img-1b", image_url: PHOTO_ROAD_REPAIR_1, image_type: "AFTER", uploaded_at: daysAgoIso(44) },
      ],
      timeline: [
        { history_id: "h-1", new_status: "SUBMITTED", remarks: "Complaint submitted with photo evidence.", changed_at: daysAgoIso(45) },
        { history_id: "h-2", new_status: "AWAITING_VERIFICATION", remarks: "After-repair photo uploaded.", changed_at: daysAgoIso(44) },
        { history_id: "h-3", new_status: "RESOLVED_VERIFIED", remarks: "Resolved – Citizen Verified (2/2 confirmed).", changed_at: daysAgoIso(43) },
      ],
      verification: { total_votes: 2, confirmed_count: 2, disputed_count: 0, confirm_percentage: 100, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 3, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: true, recurrence_count: 1, previous_issues: [], subsequent_issues: [{ recurrence_id: "rec-1", complaint_id: "c-0002", reference_code: "CT-2026-0002", status: "IN_PROGRESS", reported_at: daysAgoIso(2), similarity_reason: "Same category reported 14.8m away.", review_status: "CONFIRMED" }] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0002",
      reference_code: "CT-2026-0002",
      category: "potholes_road_damage",
      description: "Multiple water-filled potholes reappeared on 100ft Road junction after monsoon showers.",
      latitude: 12.9782,
      longitude: 77.6406,
      address_hint: "100 Feet Road, near 12th Main, Indiranagar (Demo)",
      area_id: "area-ind",
      area_name: "Indiranagar Pilot Zone (Demo)",
      department_id: "dept-roads",
      department_name: "Road & Carriageway Maintenance Queue (Demo)",
      department_code: "ROADS-DEMO",
      priority_score: 82.0,
      priority_level: "Critical",
      status: "IN_PROGRESS",
      anonymous: false,
      is_confidential: false,
      support_count: 3,
      user_has_supported: false,
      before_images: [PHOTO_POTHOLE_2],
      after_images: [],
      thumbnail_url: PHOTO_POTHOLE_2,
      created_at: daysAgoIso(2),
      is_recurring: true,
      recurrence_count: 1,
      priority_breakdown: makeBreakdown(82.0, "Critical", "This issue has critical priority because it poses an elevated safety risk and this location has recurring infrastructure history.", 65),
      image_records: [{ image_id: "img-2a", image_url: PHOTO_POTHOLE_2, image_type: "BEFORE", uploaded_at: daysAgoIso(2) }],
      timeline: [
        { history_id: "h-21", new_status: "SUBMITTED", remarks: "Complaint submitted and linked via Civic Issue Memory.", changed_at: daysAgoIso(2) },
        { history_id: "h-22", new_status: "IN_PROGRESS", remarks: "Hot-mix resurfacing started.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 3, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: true, recurrence_count: 1, previous_issues: [{ recurrence_id: "rec-1", complaint_id: "c-0001", reference_code: "CT-2026-0001", status: "RESOLVED_VERIFIED", reported_at: daysAgoIso(45), resolved_at: daysAgoIso(43), similarity_reason: "Same category reported 14.8m from verified historical complaint CT-2026-0001.", review_status: "CONFIRMED" }], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0005",
      reference_code: "CT-2026-0005",
      category: "potholes_road_damage",
      description: "Crumbled asphalt patch outside CMH Road metro entrance resurfaced by crew.",
      latitude: 12.9789,
      longitude: 77.6382,
      address_hint: "CMH Road Metro Side, Indiranagar (Demo)",
      area_id: "area-ind",
      area_name: "Indiranagar Pilot Zone (Demo)",
      department_id: "dept-roads",
      department_name: "Road & Carriageway Maintenance Queue (Demo)",
      department_code: "ROADS-DEMO",
      priority_score: 64.0,
      priority_level: "High",
      status: "AWAITING_VERIFICATION",
      anonymous: false,
      is_confidential: false,
      support_count: 2,
      user_has_supported: false,
      before_images: [PHOTO_POTHOLE_4],
      after_images: [PHOTO_ROAD_REPAIR_2],
      thumbnail_url: PHOTO_POTHOLE_4,
      completion_requested_at: daysAgoIso(1),
      completed_by: { employee_id: "EMP-DEMO-101", designation: "Assistant Road Engineer (Demo)", department_name: "Road & Carriageway Maintenance Queue (Demo)" },
      created_at: daysAgoIso(3),
      priority_breakdown: makeBreakdown(64.0, "High", "Repair evidence uploaded; awaiting supporter verification."),
      image_records: [
        { image_id: "img-5a", image_url: PHOTO_POTHOLE_4, image_type: "BEFORE", uploaded_at: daysAgoIso(3) },
        { image_id: "img-5b", image_url: PHOTO_ROAD_REPAIR_2, image_type: "AFTER", uploaded_at: daysAgoIso(1) },
      ],
      timeline: [
        { history_id: "h-51", new_status: "SUBMITTED", remarks: "Submitted by citizen.", changed_at: daysAgoIso(3) },
        { history_id: "h-52", new_status: "IN_PROGRESS", remarks: "Field work started.", changed_at: daysAgoIso(2) },
        { history_id: "h-53", new_status: "AWAITING_VERIFICATION", remarks: "After-repair photograph uploaded; open for supporter verification.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 2, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0006",
      reference_code: "CT-2026-0006",
      category: "garbage_accumulation",
      description: "Overflowing public bin near Koramangala 6th Block park cleared and street washed.",
      latitude: 12.9372,
      longitude: 77.6225,
      address_hint: "6th Block Park Corner, Koramangala (Demo)",
      area_id: "area-krm",
      area_name: "Koramangala Pilot Zone (Demo)",
      department_id: "dept-waste",
      department_name: "Solid Waste & Street Sanitation Queue (Demo)",
      department_code: "SANITATION-DEMO",
      priority_score: 52.0,
      priority_level: "Medium",
      status: "AWAITING_VERIFICATION",
      anonymous: false,
      is_confidential: false,
      support_count: 2,
      user_has_supported: false,
      before_images: [PHOTO_GARBAGE_1],
      after_images: [PHOTO_GARBAGE_AFTER_2],
      thumbnail_url: PHOTO_GARBAGE_1,
      completion_requested_at: daysAgoIso(1),
      completed_by: { employee_id: "EMP-DEMO-102", designation: "Sanitation Supervisor (Demo)", department_name: "Solid Waste & Street Sanitation Queue (Demo)" },
      created_at: daysAgoIso(2),
      priority_breakdown: makeBreakdown(52.0, "Medium", "Sanitation clearance uploaded; awaiting supporter verification."),
      image_records: [
        { image_id: "img-6a", image_url: PHOTO_GARBAGE_1, image_type: "BEFORE", uploaded_at: daysAgoIso(2) },
        { image_id: "img-6b", image_url: PHOTO_GARBAGE_AFTER_2, image_type: "AFTER", uploaded_at: daysAgoIso(1) },
      ],
      timeline: [
        { history_id: "h-61", new_status: "SUBMITTED", remarks: "Waste accumulation reported.", changed_at: daysAgoIso(2) },
        { history_id: "h-62", new_status: "AWAITING_VERIFICATION", remarks: "Area cleared and photographed.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 2, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0007",
      reference_code: "CT-2026-0007",
      category: "garbage_accumulation",
      description: "Overflowing roadside waste dump near Sony World Signal; partial cleanup left waste behind.",
      latitude: 12.9341,
      longitude: 77.6269,
      address_hint: "Near Sony World Junction, Koramangala (Demo)",
      area_id: "area-krm",
      area_name: "Koramangala Pilot Zone (Demo)",
      department_id: "dept-waste",
      department_name: "Solid Waste & Street Sanitation Queue (Demo)",
      department_code: "SANITATION-DEMO",
      priority_score: 68.0,
      priority_level: "High",
      status: "DISPUTED",
      anonymous: false,
      is_confidential: false,
      support_count: 3,
      user_has_supported: false,
      before_images: [PHOTO_GARBAGE_3],
      after_images: [PHOTO_GARBAGE_AFTER_1],
      thumbnail_url: PHOTO_GARBAGE_3,
      completion_requested_at: daysAgoIso(2),
      completed_by: { employee_id: "EMP-DEMO-102", designation: "Sanitation Supervisor (Demo)", department_name: "Solid Waste & Street Sanitation Queue (Demo)" },
      created_at: daysAgoIso(4),
      priority_breakdown: makeBreakdown(68.0, "High", "Verification disputed by supporters; eligible for reopening."),
      image_records: [
        { image_id: "img-7a", image_url: PHOTO_GARBAGE_3, image_type: "BEFORE", uploaded_at: daysAgoIso(4) },
        { image_id: "img-7b", image_url: PHOTO_GARBAGE_AFTER_1, image_type: "AFTER", uploaded_at: daysAgoIso(2) },
      ],
      timeline: [
        { history_id: "h-71", new_status: "SUBMITTED", remarks: "Reported by citizens.", changed_at: daysAgoIso(4) },
        { history_id: "h-72", new_status: "AWAITING_VERIFICATION", remarks: "After photo uploaded.", changed_at: daysAgoIso(2) },
        { history_id: "h-73", new_status: "DISPUTED", remarks: "2/2 supporters reported issue still exists.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 2, confirmed_count: 0, disputed_count: 2, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 3, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0004",
      reference_code: "CT-2026-0004",
      category: "drainage_blockage",
      description: "Drainage overflow returned at 80ft Road junction; stagnant wastewater flooding pedestrian lane.",
      latitude: 12.9356,
      longitude: 77.6249,
      address_hint: "80 Feet Road Cross, Koramangala 4th Block (Demo)",
      area_id: "area-krm",
      area_name: "Koramangala Pilot Zone (Demo)",
      department_id: "dept-drain",
      department_name: "Stormwater & Sewerage Maintenance Queue (Demo)",
      department_code: "DRAINS-DEMO",
      priority_score: 86.5,
      priority_level: "Critical",
      status: "OVERDUE",
      anonymous: false,
      is_confidential: false,
      support_count: 3,
      user_has_supported: false,
      before_images: [PHOTO_DRAIN_2],
      after_images: [],
      thumbnail_url: PHOTO_DRAIN_2,
      created_at: daysAgoIso(5),
      is_recurring: true,
      recurrence_count: 1,
      priority_breakdown: makeBreakdown(86.5, "Critical", "SLA deadline exceeded and recurring drainage blockage.", 65),
      image_records: [{ image_id: "img-4a", image_url: PHOTO_DRAIN_2, image_type: "BEFORE", uploaded_at: daysAgoIso(5) }],
      timeline: [
        { history_id: "h-41", new_status: "SUBMITTED", remarks: "Reported at 80ft Road junction.", changed_at: daysAgoIso(5) },
        { history_id: "h-42", new_status: "OVERDUE", remarks: "SLA deadline exceeded by 32 hours; escalated Level 2.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 3, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: true, recurrence_count: 1, previous_issues: [{ recurrence_id: "rec-2", complaint_id: "c-0003", reference_code: "CT-2026-0003", status: "RESOLVED_VERIFIED", reported_at: daysAgoIso(38), resolved_at: daysAgoIso(36), similarity_reason: "Same drainage category 15.2m away.", review_status: "CONFIRMED" }], subsequent_issues: [] },
      escalations: [{ escalation_id: "esc-1", escalation_level: 2, reason: "Demonstration SLA deadline exceeded by 32h.", created_at: daysAgoIso(1) }],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0003",
      reference_code: "CT-2026-0003",
      category: "drainage_blockage",
      description: "Stormwater gully blocked with silt near 80ft Road bus stop causing curb waterlogging.",
      latitude: 12.9355,
      longitude: 77.6248,
      address_hint: "80 Feet Road, Koramangala 4th Block (Demo)",
      area_id: "area-krm",
      area_name: "Koramangala Pilot Zone (Demo)",
      department_id: "dept-drain",
      department_name: "Stormwater & Sewerage Maintenance Queue (Demo)",
      department_code: "DRAINS-DEMO",
      priority_score: 58.0,
      priority_level: "High",
      status: "RESOLVED_VERIFIED",
      anonymous: false,
      is_confidential: false,
      support_count: 2,
      user_has_supported: false,
      before_images: [PHOTO_DRAIN_1],
      after_images: [PHOTO_DRAIN_AFTER_1],
      thumbnail_url: PHOTO_DRAIN_1,
      completion_requested_at: daysAgoIso(37),
      created_at: daysAgoIso(38),
      resolved_at: daysAgoIso(36),
      is_recurring: true,
      recurrence_count: 1,
      priority_breakdown: makeBreakdown(58.0, "High", "Historical drainage repair verified by citizens."),
      image_records: [
        { image_id: "img-3a", image_url: PHOTO_DRAIN_1, image_type: "BEFORE", uploaded_at: daysAgoIso(38) },
        { image_id: "img-3b", image_url: PHOTO_DRAIN_AFTER_1, image_type: "AFTER", uploaded_at: daysAgoIso(37) },
      ],
      timeline: [{ history_id: "h-31", new_status: "RESOLVED_VERIFIED", remarks: "Verified by community.", changed_at: daysAgoIso(36) }],
      verification: { total_votes: 2, confirmed_count: 2, disputed_count: 0, confirm_percentage: 100, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 2, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: true, recurrence_count: 1, previous_issues: [], subsequent_issues: [{ recurrence_id: "rec-2", complaint_id: "c-0004", reference_code: "CT-2026-0004", status: "OVERDUE", reported_at: daysAgoIso(5), similarity_reason: "Recurring drain blockage.", review_status: "CONFIRMED" }] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0010",
      reference_code: "CT-2026-0010",
      category: "potholes_road_damage",
      description: "Severe monsoon road flooding and submerged potholes near Indiranagar BDA Complex.",
      latitude: 12.9765,
      longitude: 77.6422,
      address_hint: "Near BDA Complex, Indiranagar (Demo)",
      area_id: "area-ind",
      area_name: "Indiranagar Pilot Zone (Demo)",
      department_id: "dept-roads",
      department_name: "Road & Carriageway Maintenance Queue (Demo)",
      department_code: "ROADS-DEMO",
      priority_score: 54.5,
      priority_level: "Medium",
      status: "ASSIGNED",
      anonymous: false,
      is_confidential: false,
      support_count: 2,
      user_has_supported: false,
      before_images: [PHOTO_POTHOLE_3],
      after_images: [],
      thumbnail_url: PHOTO_POTHOLE_3,
      created_at: daysAgoIso(1),
      priority_breakdown: makeBreakdown(54.5, "Medium", "Assigned to Indiranagar Road Queue."),
      image_records: [{ image_id: "img-10a", image_url: PHOTO_POTHOLE_3, image_type: "BEFORE", uploaded_at: daysAgoIso(1) }],
      timeline: [
        { history_id: "h-101", new_status: "SUBMITTED", remarks: "Reported by citizen.", changed_at: daysAgoIso(1) },
        { history_id: "h-102", new_status: "ASSIGNED", remarks: "Routed to ROADS-DEMO.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 2, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0011",
      reference_code: "CT-2026-0011",
      category: "garbage_accumulation",
      description: "Overflowing street litter bin and uncollected commercial bags near Jayanagar 3rd Block lane.",
      latitude: 12.9315,
      longitude: 77.5812,
      address_hint: "8th Cross, Jayanagar 3rd Block (Demo)",
      area_id: "area-jyn",
      area_name: "Jayanagar Pilot Zone (Demo)",
      department_id: "dept-waste",
      department_name: "Solid Waste & Street Sanitation Queue (Demo)",
      department_code: "SANITATION-DEMO",
      priority_score: 49.0,
      priority_level: "Medium",
      status: "ASSIGNED",
      anonymous: true,
      is_confidential: false,
      support_count: 1,
      user_has_supported: false,
      before_images: [PHOTO_GARBAGE_2],
      after_images: [],
      thumbnail_url: PHOTO_GARBAGE_2,
      created_at: daysAgoIso(1),
      priority_breakdown: makeBreakdown(49.0, "Medium", "Anonymous report routed to Sanitation Queue."),
      image_records: [{ image_id: "img-11a", image_url: PHOTO_GARBAGE_2, image_type: "BEFORE", uploaded_at: daysAgoIso(1) }],
      timeline: [{ history_id: "h-111", new_status: "ASSIGNED", remarks: "Anonymous report assigned.", changed_at: daysAgoIso(1) }],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 1, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0013",
      reference_code: "CT-2026-0013",
      category: "potholes_road_damage",
      description: "Sub-standard patch subsided within 48 hours on Jayanagar 9th Block cross road.",
      latitude: 12.9255,
      longitude: 77.5861,
      address_hint: "Jayanagar 9th Block (Demo)",
      area_id: "area-jyn",
      area_name: "Jayanagar Pilot Zone (Demo)",
      department_id: "dept-roads",
      department_name: "Road & Carriageway Maintenance Queue (Demo)",
      department_code: "ROADS-DEMO",
      priority_score: 71.0,
      priority_level: "High",
      status: "REOPENED",
      anonymous: false,
      is_confidential: false,
      support_count: 2,
      user_has_supported: false,
      before_images: [PHOTO_ROAD_AFTER_CLEAN],
      after_images: [],
      thumbnail_url: PHOTO_ROAD_AFTER_CLEAN,
      created_at: daysAgoIso(7),
      priority_breakdown: makeBreakdown(71.0, "High", "Reopened following citizen verification dispute."),
      image_records: [{ image_id: "img-13a", image_url: PHOTO_ROAD_AFTER_CLEAN, image_type: "BEFORE", uploaded_at: daysAgoIso(7) }],
      timeline: [
        { history_id: "h-131", new_status: "SUBMITTED", remarks: "Submitted by citizen.", changed_at: daysAgoIso(7) },
        { history_id: "h-132", new_status: "REOPENED", remarks: "Reopened for durable corrective repair.", changed_at: daysAgoIso(1) },
      ],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 2, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
    {
      complaint_id: "c-0009",
      reference_code: "CT-2026-0009",
      category: "drainage_blockage",
      description: "Blocked stormwater alley drain causing standing wastewater near ITPB Main Road.",
      latitude: 12.9712,
      longitude: 77.7485,
      address_hint: "ITPB Main Road, Whitefield (Demo)",
      area_id: "area-wtf",
      area_name: "Whitefield Pilot Zone (Demo)",
      department_id: "dept-drain",
      department_name: "Stormwater & Sewerage Maintenance Queue (Demo)",
      department_code: "DRAINS-DEMO",
      priority_score: 62.0,
      priority_level: "High",
      status: "UNDER_REVIEW",
      anonymous: false,
      is_confidential: false,
      support_count: 2,
      user_has_supported: false,
      before_images: [PHOTO_DRAIN_3],
      after_images: [],
      thumbnail_url: PHOTO_DRAIN_3,
      created_at: daysAgoIso(1),
      priority_breakdown: makeBreakdown(62.0, "High", "Ambiguous shared drain corridor routed to Admin review."),
      image_records: [{ image_id: "img-9a", image_url: PHOTO_DRAIN_3, image_type: "BEFORE", uploaded_at: daysAgoIso(1) }],
      timeline: [{ history_id: "h-91", new_status: "UNDER_REVIEW", remarks: "Shared sample jurisdiction pending admin confirmation.", changed_at: daysAgoIso(1) }],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: 2, user_is_eligible: false, user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    },
  ];

  const supports: Record<string, SupportEntry[]> = {
    "c-0001": [{ user_id: "u-cit-1", created_at: daysAgoIso(45) }, { user_id: "u-cit-2", created_at: daysAgoIso(45) }, { user_id: "u-cit-3", created_at: daysAgoIso(45) }],
    "c-0002": [{ user_id: "u-cit-2", created_at: daysAgoIso(2) }, { user_id: "u-cit-3", created_at: daysAgoIso(2) }],
    "c-0005": [{ user_id: "u-cit-1", created_at: daysAgoIso(3) }, { user_id: "u-cit-2", created_at: daysAgoIso(3) }],
    "c-0006": [{ user_id: "u-cit-1", created_at: daysAgoIso(2) }, { user_id: "u-cit-2", created_at: daysAgoIso(2) }],
    "c-0007": [{ user_id: "u-cit-1", created_at: daysAgoIso(4) }, { user_id: "u-cit-2", created_at: daysAgoIso(4) }, { user_id: "u-cit-3", created_at: daysAgoIso(4) }],
    "c-0004": [{ user_id: "u-cit-3", created_at: daysAgoIso(5) }],
    "c-0003": [{ user_id: "u-cit-3", created_at: daysAgoIso(38) }],
    "c-0010": [{ user_id: "u-cit-2", created_at: daysAgoIso(1) }],
    "c-0011": [{ user_id: "u-cit-3", created_at: daysAgoIso(1) }],
    "c-0013": [{ user_id: "u-cit-2", created_at: daysAgoIso(7) }],
    "c-0009": [{ user_id: "u-cit-3", created_at: daysAgoIso(1) }],
  };

  const votes: Record<string, VoteEntry[]> = {
    "c-0001": [
      { user_id: "u-cit-1", vote: "WORK_COMPLETED", created_at: daysAgoIso(43) },
      { user_id: "u-cit-2", vote: "WORK_COMPLETED", created_at: daysAgoIso(43) },
    ],
    "c-0003": [
      { user_id: "u-cit-3", vote: "WORK_COMPLETED", created_at: daysAgoIso(36) },
    ],
    "c-0007": [
      { user_id: "u-cit-1", vote: "ISSUE_STILL_EXISTS", created_at: daysAgoIso(1) },
      { user_id: "u-cit-2", vote: "ISSUE_STILL_EXISTS", created_at: daysAgoIso(1) },
    ],
  };

  return { complaints, supports, votes, users: DEMO_USERS, currentUser: null };
}

function loadStore(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const initial = buildInitialStore();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveStore(store: DemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function clearStaticDemoUser(): void {
  try {
    const store = loadStore();
    store.currentUser = null;
    saveStore(store);
  } catch {
    // ignore
  }
}

function hydrateComplaintForUser(c: ComplaintDetail, store: DemoStore): ComplaintDetail {
  const uid = store.currentUser?.user_id || null;
  const supList = store.supports[c.complaint_id] || [];
  const voteList = store.votes[c.complaint_id] || [];
  const confirmed = voteList.filter((v) => v.vote === "WORK_COMPLETED").length;
  const disputed = voteList.filter((v) => v.vote === "ISSUE_STILL_EXISTS").length;
  const totalVotes = voteList.length;
  const compAt = c.completion_requested_at ? Date.parse(c.completion_requested_at) : null;
  const eligibleIds = new Set(
    supList
      .filter((s) => compAt === null || Date.parse(s.created_at) <= compAt)
      .map((s) => s.user_id)
  );
  const myVote = uid ? voteList.find((v) => v.user_id === uid) : undefined;

  return {
    ...c,
    support_count: supList.length,
    user_has_supported: Boolean(uid && supList.some((s) => s.user_id === uid)),
    verification: {
      ...c.verification,
      total_votes: totalVotes,
      confirmed_count: confirmed,
      disputed_count: disputed,
      confirm_percentage: totalVotes > 0 ? Math.round((confirmed / totalVotes) * 100) : 0,
      eligible_supporters_count: eligibleIds.size,
      user_is_eligible: Boolean(uid && eligibleIds.has(uid)),
      user_has_voted: Boolean(myVote),
      user_vote: myVote ? myVote.vote : null,
    },
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read uploaded image."));
    reader.readAsDataURL(file);
  });
}

export async function handleStaticDemoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const store = loadStore();
  const method = (options.method || "GET").toUpperCase();
  const [cleanPath, queryStr] = path.split("?");
  const params = new URLSearchParams(queryStr || "");

  if (cleanPath === "/api/areas") {
    return { is_demo_data: true, areas: DEMO_AREAS } as unknown as T;
  }
  if (cleanPath === "/api/categories" || cleanPath === "/api/admin/categories") {
    return { categories: DEMO_CATEGORIES } as unknown as T;
  }
  if (cleanPath === "/api/stats") {
    const total = store.complaints.length;
    const resolved_verified = store.complaints.filter((c) => c.status === "RESOLVED_VERIFIED").length;
    const awaiting_verification = store.complaints.filter((c) => c.status === "AWAITING_VERIFICATION").length;
    const overdue = store.complaints.filter((c) => c.status === "OVERDUE").length;
    const pending = store.complaints.filter((c) => !["RESOLVED_VERIFIED", "AWAITING_VERIFICATION"].includes(c.status)).length;
    const recurring = store.complaints.filter((c) => c.is_recurring).length;
    return {
      total_complaints: total,
      resolved_verified,
      awaiting_verification,
      pending_complaints: pending,
      overdue_complaints: overdue,
      recurring_issues_count: recurring,
      is_demo_data: true,
    } as unknown as T;
  }

  if (cleanPath === "/api/auth/me") {
    if (!store.currentUser) throw new Error("Not signed in");
    return store.currentUser as unknown as T;
  }

  if (cleanPath === "/api/auth/login" || cleanPath === "/api/officers/login") {
    const body = JSON.parse((options.body as string) || "{}");
    const key = body.employee_id || (body.email || "").toLowerCase().trim();
    const entry = store.users[key];
    if (!entry || entry.password !== body.password) {
      throw new Error("Invalid demo credentials.");
    }
    if (cleanPath === "/api/officers/login" && entry.user.role === "citizen") {
      throw new Error("Officer or administrator account required.");
    }
    store.currentUser = entry.user;
    saveStore(store);
    return { access_token: `static-demo-${entry.user.user_id}`, token_type: "bearer", user: entry.user } as unknown as T;
  }

  if (cleanPath === "/api/auth/register") {
    const body = JSON.parse((options.body as string) || "{}");
    const email = (body.email || "").toLowerCase().trim();
    if (store.users[email]) throw new Error("An account with this email already exists.");
    const user: UserSummary = {
      user_id: `u-cit-${Date.now()}`,
      full_name: body.full_name || "Citizen Demo",
      email,
      role: "citizen",
    };
    store.users[email] = { user, password: body.password };
    store.currentUser = user;
    saveStore(store);
    return { access_token: `static-demo-${user.user_id}`, token_type: "bearer", user } as unknown as T;
  }

  if (cleanPath === "/api/notifications") {
    return { unread_count: 0, notifications: [] } as unknown as T;
  }

  if (cleanPath === "/api/ai/classify") {
    let desc = "";
    if (options.body instanceof FormData) desc = String(options.body.get("description") || "").toLowerCase();
    let suggested = "potholes_road_damage";
    if (desc.includes("garbage") || desc.includes("trash") || desc.includes("waste")) suggested = "garbage_accumulation";
    if (desc.includes("drain") || desc.includes("water") || desc.includes("sew")) suggested = "drainage_blockage";
    return {
      suggested_category: suggested,
      severity_hint: desc.includes("deep") || desc.includes("flood") ? "High" : "Medium",
      confidence: 0.72,
      mode: "heuristic_fallback",
      reasoning: "Rule-based fallback suggestion using context keywords (no external vision model configured).",
      is_simulated_fallback: true,
    } as unknown as T;
  }

  if (cleanPath === "/api/routing/suggest") {
    const body = JSON.parse((options.body as string) || "{}");
    const cat = body.category || "potholes_road_damage";
    const deptName =
      cat === "garbage_accumulation"
        ? "Solid Waste & Street Sanitation Queue (Demo)"
        : cat === "drainage_blockage"
        ? "Stormwater & Sewerage Maintenance Queue (Demo)"
        : "Road & Carriageway Maintenance Queue (Demo)";
    return {
      area_id: "area-ind",
      area_name: "Indiranagar Pilot Zone (Demo)",
      department_name: deptName,
      department_code: cat === "garbage_accumulation" ? "SANITATION-DEMO" : cat === "drainage_blockage" ? "DRAINS-DEMO" : "ROADS-DEMO",
      confidence: 0.89,
      requires_admin_review: false,
      reason: "Matched sample Bengaluru pilot jurisdiction (Static Demo Mode).",
    } as unknown as T;
  }

  if (cleanPath === "/api/complaints/nearby") {
    const lat = Number(params.get("latitude") || 0);
    const lng = Number(params.get("longitude") || 0);
    const cat = params.get("category") || "";
    const matches = store.complaints
      .filter((c) => c.category === cat && c.status !== "RESOLVED_VERIFIED")
      .map((c) => {
        const dLat = (c.latitude - lat) * 111000;
        const dLng = (c.longitude - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        return { ...hydrateComplaintForUser(c, store), distance_meters: Math.round(dist) };
      })
      .filter((m) => m.distance_meters <= 80);
    return { duplicate_detected: matches.length > 0, matches } as unknown as T;
  }

  if (cleanPath === "/api/recurring-issues") {
    const c1 = store.complaints.find((c) => c.reference_code === "CT-2026-0001")!;
    const c2 = store.complaints.find((c) => c.reference_code === "CT-2026-0002")!;
    const c3 = store.complaints.find((c) => c.reference_code === "CT-2026-0003")!;
    const c4 = store.complaints.find((c) => c.reference_code === "CT-2026-0004")!;
    return {
      total_recurrence_links: 2,
      recurring_issues: [
        { recurrence_id: "rec-1", similarity_reason: "Same road damage category 14.8m from CT-2026-0001.", review_status: "CONFIRMED", previous_complaint: c1, new_complaint: c2 },
        { recurrence_id: "rec-2", similarity_reason: "Same drainage category 15.2m from CT-2026-0003.", review_status: "CONFIRMED", previous_complaint: c3, new_complaint: c4 },
      ],
      hotspots: [
        { cluster_key: "h1", category: c2.category, area_name: c2.area_name, address_hint: c2.address_hint, latitude: c2.latitude, longitude: c2.longitude, occurrences: 2, complaint_refs: ["CT-2026-0001", "CT-2026-0002"] },
        { cluster_key: "h2", category: c4.category, area_name: c4.area_name, address_hint: c4.address_hint, latitude: c4.latitude, longitude: c4.longitude, occurrences: 2, complaint_refs: ["CT-2026-0003", "CT-2026-0004"] },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/complaints" && method === "POST") {
    const fd = options.body as FormData;
    const cat = String(fd.get("category") || "potholes_road_damage");
    const desc = String(fd.get("description") || "New public infrastructure issue");
    const lat = Number(fd.get("latitude") || 12.9784);
    const lng = Number(fd.get("longitude") || 77.6408);
    const addr = String(fd.get("address_hint") || "Bengaluru Pilot Zone (Demo)");
    const anon = fd.get("anonymous") === "true";
    const uploaded = fd.get("image");
    let img = cat === "garbage_accumulation" ? PHOTO_GARBAGE_1 : cat === "drainage_blockage" ? PHOTO_DRAIN_1 : PHOTO_POTHOLE_2;
    if (uploaded instanceof File) {
      try {
        img = await fileToDataUrl(uploaded);
      } catch {
        // keep category photographic fallback
      }
    }
    const cid = `c-${Date.now()}`;
    const ref = `CT-2026-${String(store.complaints.length + 101).padStart(4, "0")}`;
    const nowIso = new Date().toISOString();
    const uid = !anon && store.currentUser ? store.currentUser.user_id : null;
    if (uid) {
      store.supports[cid] = [{ user_id: uid, created_at: nowIso }];
    } else {
      store.supports[cid] = [];
    }
    store.votes[cid] = [];

    const created: ComplaintDetail = {
      complaint_id: cid,
      reference_code: ref,
      category: cat,
      description: desc,
      latitude: lat,
      longitude: lng,
      address_hint: addr,
      area_id: "area-ind",
      area_name: "Indiranagar Pilot Zone (Demo)",
      department_id: cat === "garbage_accumulation" ? "dept-waste" : cat === "drainage_blockage" ? "dept-drain" : "dept-roads",
      department_name: cat === "garbage_accumulation" ? "Solid Waste & Street Sanitation Queue (Demo)" : cat === "drainage_blockage" ? "Stormwater & Sewerage Maintenance Queue (Demo)" : "Road & Carriageway Maintenance Queue (Demo)",
      department_code: cat === "garbage_accumulation" ? "SANITATION-DEMO" : cat === "drainage_blockage" ? "DRAINS-DEMO" : "ROADS-DEMO",
      priority_score: 66.0,
      priority_level: "High",
      status: "ASSIGNED",
      anonymous: anon,
      is_confidential: fd.get("is_confidential") === "true",
      support_count: uid ? 1 : 0,
      user_has_supported: Boolean(uid),
      before_images: [img],
      after_images: [],
      thumbnail_url: img,
      created_at: nowIso,
      image_records: [{ image_id: `img-${Date.now()}`, image_url: img, image_type: "BEFORE", uploaded_at: nowIso }],
      timeline: [{ history_id: `h-${Date.now()}`, new_status: "ASSIGNED", remarks: "Submitted and routed in Static Demo Mode.", changed_at: nowIso }],
      verification: { total_votes: 0, confirmed_count: 0, disputed_count: 0, confirm_percentage: 0, min_votes_required: 2, pass_ratio_required: 0.5, eligible_supporters_count: uid ? 1 : 0, user_is_eligible: Boolean(uid), user_has_voted: false },
      recurrence: { is_recurring: false, recurrence_count: 0, previous_issues: [], subsequent_issues: [] },
      escalations: [],
      related_historical_complaints: [],
      is_demo_data: true,
    };
    store.complaints.unshift(created);
    saveStore(store);
    return hydrateComplaintForUser(created, store) as unknown as T;
  }

  if (cleanPath === "/api/complaints" && method === "GET") {
    let items = store.complaints.map((c) => hydrateComplaintForUser(c, store));
    const search = (params.get("search") || "").toLowerCase();
    const cat = params.get("category") || "";
    const area = params.get("area_id") || "";
    const st = params.get("status") || "";
    const pr = params.get("priority_level") || "";
    const sort = params.get("sort") || "newest";
    if (cat) items = items.filter((c) => c.category === cat);
    if (area) items = items.filter((c) => c.area_id === area);
    if (st) items = items.filter((c) => c.status === st);
    if (pr) items = items.filter((c) => c.priority_level === pr);
    if (search) items = items.filter((c) => (c.reference_code + " " + (c.description || "") + " " + (c.address_hint || "")).toLowerCase().includes(search));
    if (sort === "highest_priority") items.sort((a, b) => b.priority_score - a.priority_score);
    if (sort === "oldest") items.reverse();
    return { total: items.length, items } as unknown as T;
  }

  if (cleanPath.startsWith("/api/complaints/") && cleanPath.endsWith("/support") && method === "POST") {
    if (!store.currentUser) throw new Error("Authentication required. Please sign in as a citizen to support issues.");
    if (store.currentUser.role !== "citizen") throw new Error("Only authenticated citizen accounts can support complaints.");
    const cid = cleanPath.split("/")[3];
    const c = store.complaints.find((x) => x.complaint_id === cid);
    if (!c) throw new Error("Complaint not found");
    const list = store.supports[cid] || [];
    if (list.some((s) => s.user_id === store.currentUser!.user_id)) {
      throw new Error("You have already supported this complaint.");
    }
    list.push({ user_id: store.currentUser.user_id, created_at: new Date().toISOString() });
    store.supports[cid] = list;
    c.priority_score = Math.min(100, Number((c.priority_score + 2.5).toFixed(1)));
    saveStore(store);
    return {
      complaint_id: c.complaint_id,
      support_count: list.length,
      priority_score: c.priority_score,
      priority_level: c.priority_level,
      user_has_supported: true,
    } as unknown as T;
  }

  if (cleanPath.startsWith("/api/complaints/") && cleanPath.endsWith("/verify") && method === "POST") {
    if (!store.currentUser) throw new Error("Authentication required.");
    const cid = cleanPath.split("/")[3];
    const c = store.complaints.find((x) => x.complaint_id === cid);
    if (!c) throw new Error("Complaint not found");
    const hydrated = hydrateComplaintForUser(c, store);
    if (!hydrated.verification.user_is_eligible) {
      throw new Error("Only citizens who supported this complaint before completion was requested are eligible to verify.");
    }
    if (hydrated.verification.user_has_voted) {
      throw new Error("You have already submitted a verification vote for this complaint.");
    }
    const body = JSON.parse((options.body as string) || "{}");
    const vList = store.votes[cid] || [];
    vList.push({ user_id: store.currentUser.user_id, vote: body.vote, created_at: new Date().toISOString() });
    store.votes[cid] = vList;
    const confirmed = vList.filter((v) => v.vote === "WORK_COMPLETED").length;
    const disputed = vList.filter((v) => v.vote === "ISSUE_STILL_EXISTS").length;
    c.timeline.push({
      history_id: `h-${Date.now()}`,
      new_status: c.status,
      remarks: `Citizen verification vote recorded (${confirmed} completed, ${disputed} disputed; ${vList.length}/2 minimum votes).`,
      changed_at: new Date().toISOString(),
    });
    if (vList.length >= 2) {
      c.status = confirmed / vList.length >= 0.5 ? "RESOLVED_VERIFIED" : "DISPUTED";
      c.timeline.push({
        history_id: `h2-${Date.now()}`,
        new_status: c.status,
        remarks: c.status === "RESOLVED_VERIFIED" ? "Resolved – Citizen Verified." : "Disputed by supporters; eligible for reopening.",
        changed_at: new Date().toISOString(),
      });
    }
    saveStore(store);
    return hydrateComplaintForUser(c, store).verification as unknown as T;
  }

  if (cleanPath.startsWith("/api/complaints/")) {
    const cid = cleanPath.split("/")[3];
    const c = store.complaints.find((x) => x.complaint_id === cid || x.reference_code === cid);
    if (!c) throw new Error("Complaint not found");
    return hydrateComplaintForUser(c, store) as unknown as T;
  }

  if (cleanPath === "/api/officers/dashboard") {
    const all = store.complaints;
    return {
      officer: { full_name: store.currentUser?.full_name || "Demo Officer", employee_id: store.currentUser?.employee_id || "EMP-DEMO-101", department_name: store.currentUser?.department_name || "Road Queue (Demo)", assigned_area_name: store.currentUser?.assigned_area_name || "Indiranagar Pilot", designation: "Field Engineer (Demo)" },
      stats: { total_assigned: all.length, pending: all.filter((c) => ["ASSIGNED", "REOPENED", "UNDER_REVIEW"].includes(c.status)).length, in_progress: all.filter((c) => c.status === "IN_PROGRESS").length, awaiting_verification: all.filter((c) => c.status === "AWAITING_VERIFICATION").length, overdue: all.filter((c) => c.status === "OVERDUE").length, verified_resolutions: all.filter((c) => c.status === "RESOLVED_VERIFIED").length, disputed: all.filter((c) => c.status === "DISPUTED").length },
      priority_distribution: [{ name: "Critical", value: 2 }, { name: "High", value: 4 }, { name: "Medium", value: 3 }, { name: "Low", value: 1 }],
      area_statistics: [{ area: "Indiranagar", count: 4 }, { area: "Koramangala", count: 4 }, { area: "Jayanagar", count: 2 }, { area: "Whitefield", count: 1 }],
    } as unknown as T;
  }

  if (cleanPath === "/api/officers/complaints") {
    return { total: store.complaints.length, items: store.complaints.map((c) => hydrateComplaintForUser(c, store)) } as unknown as T;
  }

  if (cleanPath.startsWith("/api/officers/complaints/") && cleanPath.endsWith("/start")) {
    const cid = cleanPath.split("/")[4];
    const c = store.complaints.find((x) => x.complaint_id === cid);
    if (c) {
      c.status = "IN_PROGRESS";
      c.timeline.push({ history_id: `h-${Date.now()}`, new_status: "IN_PROGRESS", remarks: "Officer started work.", changed_at: new Date().toISOString() });
      saveStore(store);
    }
    return c as unknown as T;
  }

  if (cleanPath.startsWith("/api/officers/complaints/") && cleanPath.endsWith("/complete")) {
    const cid = cleanPath.split("/")[4];
    const c = store.complaints.find((x) => x.complaint_id === cid);
    if (c) {
      let afterImg = c.category === "garbage_accumulation" ? PHOTO_GARBAGE_AFTER_2 : c.category === "drainage_blockage" ? PHOTO_DRAIN_AFTER_1 : PHOTO_ROAD_REPAIR_1;
      if (options.body instanceof FormData) {
        const f = options.body.get("after_image");
        if (f instanceof File) {
          try {
            afterImg = await fileToDataUrl(f);
          } catch {
            // keep photo fallback
          }
        }
      }
      const nowIso = new Date().toISOString();
      c.status = "AWAITING_VERIFICATION";
      c.completion_requested_at = nowIso;
      c.completed_by = {
        employee_id: store.currentUser?.employee_id || "EMP-DEMO-101",
        designation: store.currentUser?.designation || "Demo Field Officer",
        department_name: store.currentUser?.department_name || c.department_name,
      };
      c.after_images = [afterImg];
      c.image_records.push({ image_id: `img-${Date.now()}`, image_url: afterImg, image_type: "AFTER", uploaded_at: nowIso });
      c.timeline.push({ history_id: `h-${Date.now()}`, new_status: "AWAITING_VERIFICATION", remarks: "Officer uploaded after-repair evidence and marked work as completed.", changed_at: nowIso });
      saveStore(store);
    }
    return c as unknown as T;
  }

  if (cleanPath.startsWith("/api/officers/complaints/") && cleanPath.endsWith("/reopen")) {
    const cid = cleanPath.split("/")[4];
    const c = store.complaints.find((x) => x.complaint_id === cid);
    if (c) {
      c.status = "REOPENED";
      c.timeline.push({ history_id: `h-${Date.now()}`, new_status: "REOPENED", remarks: "Reopened for corrective repair.", changed_at: new Date().toISOString() });
      saveStore(store);
    }
    return c as unknown as T;
  }

  if (cleanPath === "/api/officers/performance") {
    return { officer_id: "off-1", employee_id: "EMP-DEMO-101", full_name: "Vikram Shetty (Demo Officer)", designation: "Assistant Road Engineer (Demo)", department_name: "ROADS-DEMO", assigned_area_name: "Indiranagar", total_assigned: 5, pending: 1, in_progress: 1, awaiting_verification: 1, overdue: 0, verified_resolved: 2, disputed: 0, avg_acknowledgement_hours: 4.5, avg_resolution_hours: 26.0, verified_resolution_rate_pct: 100, citizen_positive_votes: 4, citizen_dispute_votes: 0, citizen_approval_pct: 100, recurring_issue_rate_pct: 20, badges: [{ badge_name: "Quick Responder", reason: "Consistent acknowledgement under 6 hours (Demo)." }, { badge_name: "Quality Performer", reason: "100% citizen verification approval (Demo)." }], is_demo_data: true } as unknown as T;
  }

  if (cleanPath === "/api/admin/analytics") {
    return {
      summary: { total_complaints: store.complaints.length, new_complaints: 1, pending_assignment: 1, overdue_complaints: 1, recurring_issues: 2, high_priority_complaints: 6, verification_disputes: 1, verified_resolutions: 2 },
      by_department: [{ name: "ROADS-DEMO", count: 5 }, { name: "SANITATION-DEMO", count: 3 }, { name: "DRAINS-DEMO", count: 3 }],
      by_area: [{ name: "Indiranagar", count: 4 }, { name: "Koramangala", count: 4 }, { name: "Jayanagar", count: 2 }, { name: "Whitefield", count: 1 }],
      by_category: [],
      by_status: [],
      officer_performance: [],
    } as unknown as T;
  }

  if (cleanPath === "/api/admin/complaints/pending-review") {
    return { total: 2, items: store.complaints.filter((c) => ["UNDER_REVIEW", "DISPUTED", "OVERDUE"].includes(c.status)) } as unknown as T;
  }
  if (cleanPath === "/api/admin/departments") return { departments: [{ department_id: "dept-roads", department_name: "Road Maintenance Queue (Demo)", department_code: "ROADS-DEMO" }, { department_id: "dept-waste", department_name: "Sanitation Queue (Demo)", department_code: "SANITATION-DEMO" }, { department_id: "dept-drain", department_name: "Drainage Queue (Demo)", department_code: "DRAINS-DEMO" }] } as unknown as T;
  if (cleanPath === "/api/admin/jurisdictions") return { jurisdictions: [] } as unknown as T;
  if (cleanPath === "/api/admin/officers") return { officers: [] } as unknown as T;
  if (cleanPath === "/api/admin/escalations") return { escalations: [] } as unknown as T;
  if (cleanPath === "/api/admin/audit-logs") return { logs: [] } as unknown as T;

  return {} as unknown as T;
}
