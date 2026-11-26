-- CivicTrack PostgreSQL / Supabase Database Schema
-- Enables UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(30) NOT NULL CHECK (role IN ('citizen', 'officer', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Departments (Independent demo/configurable authority records)
CREATE TABLE IF NOT EXISTS departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_name VARCHAR(200) NOT NULL,
    department_code VARCHAR(40) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Pilot Areas
CREATE TABLE IF NOT EXISTS areas (
    area_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_name VARCHAR(150) NOT NULL,
    ward_code VARCHAR(50) UNIQUE NOT NULL,
    boundary_data JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Officers
CREATE TABLE IF NOT EXISTS officers (
    officer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
    employee_id VARCHAR(60) UNIQUE NOT NULL,
    assigned_area_id UUID REFERENCES areas(area_id) ON DELETE SET NULL,
    designation VARCHAR(120) NOT NULL
);

-- 5. Configurable Complaint Categories & Deadlines
CREATE TABLE IF NOT EXISTS complaint_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key VARCHAR(80) UNIQUE NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    description TEXT,
    base_safety_severity NUMERIC(5,2) NOT NULL DEFAULT 60.0,
    default_sla_hours INTEGER NOT NULL DEFAULT 72,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Hybrid Jurisdiction Mappings
CREATE TABLE IF NOT EXISTS jurisdiction_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
    complaint_category VARCHAR(80) NOT NULL,
    ownership_type VARCHAR(80) NOT NULL DEFAULT 'Primary Sample Jurisdiction',
    confidence_or_source_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. Complaints
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code VARCHAR(32) UNIQUE NOT NULL,
    reporter_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_hint VARCHAR(255),
    area_id UUID REFERENCES areas(area_id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
    assigned_officer_id UUID REFERENCES officers(officer_id) ON DELETE SET NULL,
    priority_score NUMERIC(5,2) NOT NULL DEFAULT 50.0,
    priority_level VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority_level IN ('Critical', 'High', 'Medium', 'Low')),
    priority_explanation TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN (
            'SUBMITTED',
            'UNDER_REVIEW',
            'ASSIGNED',
            'IN_PROGRESS',
            'AWAITING_VERIFICATION',
            'DISPUTED',
            'RESOLVED_VERIFIED',
            'OVERDUE',
            'REOPENED'
        )
    ),
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
    confidential_contact VARCHAR(255),
    classification_confidence NUMERIC(5,4) DEFAULT 0.0,
    classification_mode VARCHAR(50) DEFAULT 'heuristic_fallback',
    ai_suggested_category VARCHAR(80),
    routing_reason TEXT,
    routing_confidence NUMERIC(5,4) DEFAULT 0.0,
    internal_remarks TEXT,
    completion_requested_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 8. Complaint Images
CREATE TABLE IF NOT EXISTS complaint_images (
    image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('BEFORE', 'AFTER')),
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Community Support (Upvotes)
CREATE TABLE IF NOT EXISTS complaint_support (
    support_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_complaint_support_user UNIQUE (complaint_id, user_id)
);

-- 10. Citizen Verification Votes
CREATE TABLE IF NOT EXISTS verification_votes (
    vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vote VARCHAR(30) NOT NULL CHECK (vote IN ('WORK_COMPLETED', 'ISSUE_STILL_EXISTS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verification_vote_user UNIQUE (complaint_id, user_id)
);

-- 11. Status History
CREATE TABLE IF NOT EXISTS status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    old_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    changed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    remarks TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Recurrence Links (Civic Issue Memory)
CREATE TABLE IF NOT EXISTS recurrence_links (
    recurrence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    new_complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    similarity_reason TEXT NOT NULL,
    review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('PENDING_REVIEW', 'CONFIRMED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_recurrence_pair UNIQUE (previous_complaint_id, new_complaint_id)
);

-- 13. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Escalation Records
CREATE TABLE IF NOT EXISTS escalation_records (
    escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Officer Recognition Badges
CREATE TABLE IF NOT EXISTS recognition (
    recognition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id UUID NOT NULL REFERENCES officers(officer_id) ON DELETE CASCADE,
    badge_name VARCHAR(80) NOT NULL,
    reason TEXT NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(80) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints (category);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints (priority_score DESC, priority_level);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_area_dept ON complaints (area_id, department_id);
CREATE INDEX IF NOT EXISTS idx_status_history_complaint ON status_history (complaint_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_lookup ON jurisdiction_mappings (area_id, complaint_category, is_active);
