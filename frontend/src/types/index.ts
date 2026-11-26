export type UserRole = "citizen" | "officer" | "admin";

export interface UserSummary {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  employee_id?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  assigned_area_id?: string | null;
  assigned_area_name?: string | null;
  designation?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserSummary;
}

export interface Area {
  area_id: string;
  area_name: string;
  ward_code: string;
  boundary_data?: {
    center_lat: number;
    center_lng: number;
    radius_meters: number;
    verified_zone_tier?: string;
    is_sample_boundary?: boolean;
    polygon?: [number, number][];
  } | null;
  is_active: boolean;
}

export interface ComplaintCategory {
  category_id: string;
  category_key: string;
  display_name: string;
  description?: string | null;
  base_safety_severity: number;
  default_sla_hours: number;
  is_active?: boolean;
}

export interface PriorityFactor {
  name: string;
  weight_pct: number;
  raw_score: number;
  weighted_contribution: number;
  note?: string;
}

export interface PriorityBreakdown {
  summary: string;
  score: number;
  level: "Critical" | "High" | "Medium" | "Low";
  factors: PriorityFactor[];
}

export interface ComplaintSummary {
  complaint_id: string;
  reference_code: string;
  category: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  address_hint?: string | null;
  area_id?: string | null;
  area_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  priority_score: number;
  priority_level: "Critical" | "High" | "Medium" | "Low";
  priority_summary?: string | null;
  status: string;
  anonymous: boolean;
  is_confidential: boolean;
  classification_confidence?: number | null;
  classification_mode?: string | null;
  ai_suggested_category?: string | null;
  routing_reason?: string | null;
  routing_confidence?: number | null;
  support_count: number;
  user_has_supported: boolean;
  before_images: string[];
  after_images: string[];
  thumbnail_url?: string | null;
  completion_requested_at?: string | null;
  completed_by?: {
    employee_id: string;
    designation: string;
    department_name?: string | null;
  } | null;
  due_at?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  is_recurring?: boolean;
  recurrence_count?: number;
  internal_remarks?: string | null;
  assigned_officer_id?: string | null;
  is_demo_data?: boolean;
}

export interface VerificationSummary {
  total_votes: number;
  confirmed_count: number;
  disputed_count: number;
  confirm_percentage: number;
  min_votes_required: number;
  pass_ratio_required: number;
  eligible_supporters_count: number;
  user_is_eligible: boolean;
  user_has_voted: boolean;
  user_vote?: string | null;
}

export interface RecurrenceSummary {
  is_recurring: boolean;
  recurrence_count: number;
  previous_issues: {
    recurrence_id: string;
    complaint_id: string;
    reference_code: string;
    status: string;
    reported_at?: string | null;
    resolved_at?: string | null;
    similarity_reason: string;
    review_status: string;
  }[];
  subsequent_issues: {
    recurrence_id: string;
    complaint_id: string;
    reference_code: string;
    status: string;
    reported_at?: string | null;
    similarity_reason: string;
    review_status: string;
  }[];
}

export interface ComplaintDetail extends ComplaintSummary {
  priority_breakdown?: PriorityBreakdown | null;
  image_records: {
    image_id: string;
    image_url: string;
    image_type: "BEFORE" | "AFTER";
    uploaded_at?: string | null;
  }[];
  timeline: {
    history_id: string;
    old_status?: string | null;
    new_status: string;
    remarks?: string | null;
    changed_at?: string | null;
  }[];
  verification: VerificationSummary;
  recurrence: RecurrenceSummary;
  escalations: {
    escalation_id: string;
    escalation_level: number;
    reason: string;
    created_at?: string | null;
  }[];
  related_historical_complaints: {
    complaint_id: string;
    reference_code: string;
    status: string;
    distance_meters: number;
    created_at?: string | null;
    resolved_at?: string | null;
  }[];
}

export interface NotificationItem {
  notification_id: string;
  complaint_id?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface OfficerPerformance {
  officer_id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  department_name?: string | null;
  department_code?: string | null;
  assigned_area_name?: string | null;
  total_assigned: number;
  pending: number;
  in_progress: number;
  awaiting_verification: number;
  overdue: number;
  verified_resolved: number;
  disputed: number;
  avg_acknowledgement_hours: number;
  avg_resolution_hours: number;
  verified_resolution_rate_pct: number;
  citizen_positive_votes: number;
  citizen_dispute_votes: number;
  citizen_approval_pct: number;
  recurring_issue_rate_pct: number;
  badges: {
    badge_name: string;
    reason: string;
    awarded_at?: string | null;
  }[];
  is_demo_data: boolean;
}
