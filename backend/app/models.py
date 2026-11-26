import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import relationship

from .database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=new_uuid)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(30), nullable=False, default="citizen")  # citizen | officer | admin
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    officer_profile = relationship("Officer", back_populates="user", uselist=False)


class Department(Base):
    __tablename__ = "departments"

    department_id = Column(String(36), primary_key=True, default=new_uuid)
    department_name = Column(String(200), nullable=False)
    department_code = Column(String(40), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class Area(Base):
    __tablename__ = "areas"

    area_id = Column(String(36), primary_key=True, default=new_uuid)
    area_name = Column(String(150), nullable=False)
    ward_code = Column(String(50), unique=True, nullable=False)
    boundary_data = Column(JSON, nullable=True)  # Sample polygon + center lat/lng + radius
    is_active = Column(Boolean, nullable=False, default=True)


class Officer(Base):
    __tablename__ = "officers"

    officer_id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.department_id", ondelete="RESTRICT"), nullable=False)
    employee_id = Column(String(60), unique=True, nullable=False)
    assigned_area_id = Column(String(36), ForeignKey("areas.area_id", ondelete="SET NULL"), nullable=True)
    designation = Column(String(120), nullable=False)

    user = relationship("User", back_populates="officer_profile")
    department = relationship("Department")
    assigned_area = relationship("Area")


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    category_id = Column(String(36), primary_key=True, default=new_uuid)
    category_key = Column(String(80), unique=True, nullable=False)
    display_name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    base_safety_severity = Column(Float, nullable=False, default=60.0)
    default_sla_hours = Column(Integer, nullable=False, default=72)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class JurisdictionMapping(Base):
    __tablename__ = "jurisdiction_mappings"

    mapping_id = Column(String(36), primary_key=True, default=new_uuid)
    department_id = Column(String(36), ForeignKey("departments.department_id", ondelete="CASCADE"), nullable=False)
    area_id = Column(String(36), ForeignKey("areas.area_id", ondelete="CASCADE"), nullable=False)
    complaint_category = Column(String(80), nullable=False)
    ownership_type = Column(String(80), nullable=False, default="Sample Pilot Jurisdiction")
    confidence_or_source_notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    department = relationship("Department")
    area = relationship("Area")


class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(String(36), primary_key=True, default=new_uuid)
    reference_code = Column(String(32), unique=True, nullable=False, index=True)
    reporter_id = Column(String(36), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    category = Column(String(80), nullable=False, index=True)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address_hint = Column(String(255), nullable=True)
    area_id = Column(String(36), ForeignKey("areas.area_id", ondelete="SET NULL"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.department_id", ondelete="SET NULL"), nullable=True)
    assigned_officer_id = Column(String(36), ForeignKey("officers.officer_id", ondelete="SET NULL"), nullable=True)
    priority_score = Column(Float, nullable=False, default=50.0, index=True)
    priority_level = Column(String(20), nullable=False, default="Medium", index=True)
    priority_explanation = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)
    anonymous = Column(Boolean, nullable=False, default=False)
    is_confidential = Column(Boolean, nullable=False, default=False)
    confidential_contact = Column(String(255), nullable=True)
    classification_confidence = Column(Float, nullable=True, default=0.0)
    classification_mode = Column(String(50), nullable=True, default="heuristic_fallback")
    ai_suggested_category = Column(String(80), nullable=True)
    routing_reason = Column(Text, nullable=True)
    routing_confidence = Column(Float, nullable=True, default=0.0)
    internal_remarks = Column(Text, nullable=True)
    completion_requested_at = Column(DateTime(timezone=True), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    area = relationship("Area")
    department = relationship("Department")
    assigned_officer = relationship("Officer")
    images = relationship("ComplaintImage", back_populates="complaint", cascade="all, delete-orphan")
    supports = relationship("ComplaintSupport", back_populates="complaint", cascade="all, delete-orphan")
    verification_votes = relationship("VerificationVote", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    escalations = relationship("EscalationRecord", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintImage(Base):
    __tablename__ = "complaint_images"

    image_id = Column(String(36), primary_key=True, default=new_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    image_type = Column(String(20), nullable=False, default="BEFORE")  # BEFORE | AFTER
    uploaded_by = Column(String(36), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    complaint = relationship("Complaint", back_populates="images")


class ComplaintSupport(Base):
    __tablename__ = "complaint_support"
    __table_args__ = (UniqueConstraint("complaint_id", "user_id", name="uq_complaint_support_user"),)

    support_id = Column(String(36), primary_key=True, default=new_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    complaint = relationship("Complaint", back_populates="supports")


class VerificationVote(Base):
    __tablename__ = "verification_votes"
    __table_args__ = (UniqueConstraint("complaint_id", "user_id", name="uq_verification_vote_user"),)

    vote_id = Column(String(36), primary_key=True, default=new_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    vote = Column(String(30), nullable=False)  # WORK_COMPLETED | ISSUE_STILL_EXISTS
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    complaint = relationship("Complaint", back_populates="verification_votes")


class StatusHistory(Base):
    __tablename__ = "status_history"

    history_id = Column(String(36), primary_key=True, default=new_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    old_status = Column(String(32), nullable=True)
    new_status = Column(String(32), nullable=False)
    changed_by = Column(String(36), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    complaint = relationship("Complaint", back_populates="status_history")


class RecurrenceLink(Base):
    __tablename__ = "recurrence_links"
    __table_args__ = (UniqueConstraint("previous_complaint_id", "new_complaint_id", name="uq_recurrence_pair"),)

    recurrence_id = Column(String(36), primary_key=True, default=new_uuid)
    previous_complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    new_complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    similarity_reason = Column(Text, nullable=False)
    review_status = Column(String(30), nullable=False, default="PENDING_REVIEW")  # PENDING_REVIEW | CONFIRMED | DISMISSED
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class EscalationRecord(Base):
    __tablename__ = "escalation_records"

    escalation_id = Column(String(36), primary_key=True, default=new_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    escalation_level = Column(Integer, nullable=False, default=1)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    complaint = relationship("Complaint", back_populates="escalations")


class Recognition(Base):
    __tablename__ = "recognition"

    recognition_id = Column(String(36), primary_key=True, default=new_uuid)
    officer_id = Column(String(36), ForeignKey("officers.officer_id", ondelete="CASCADE"), nullable=False)
    badge_name = Column(String(80), nullable=False)
    reason = Column(Text, nullable=False)
    awarded_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(String(36), primary_key=True, default=new_uuid)
    actor_id = Column(String(36), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(60), nullable=False)
    entity_id = Column(String(80), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
