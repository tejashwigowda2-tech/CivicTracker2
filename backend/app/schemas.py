from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CitizenRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=4, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=30)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: Optional[str] = None
    employee_id: Optional[str] = None
    password: str = Field(..., min_length=4, max_length=128)


class UserSummary(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    assigned_area_id: Optional[str] = None
    assigned_area_name: Optional[str] = None
    designation: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary


class PriorityCalculateRequest(BaseModel):
    category: str
    description: Optional[str] = ""
    severity_hint: Optional[str] = None
    support_count: int = 0
    recurrence_count: int = 0
    area_id: Optional[str] = None


class RoutingSuggestRequest(BaseModel):
    category: str
    latitude: float
    longitude: float
    area_id: Optional[str] = None


class VerificationVoteRequest(BaseModel):
    vote: str = Field(..., pattern="^(WORK_COMPLETED|ISSUE_STILL_EXISTS)$")


class OfficerStartWorkRequest(BaseModel):
    remarks: Optional[str] = None
    internal_remarks: Optional[str] = None


class AdminAssignRequest(BaseModel):
    department_id: str
    assigned_officer_id: Optional[str] = None
    area_id: Optional[str] = None
    remarks: Optional[str] = None
    reopen: bool = False


class JurisdictionCreateRequest(BaseModel):
    department_id: str
    area_id: str
    complaint_category: str
    ownership_type: str = "Sample Pilot Jurisdiction"
    confidence_or_source_notes: Optional[str] = None


class CategoryCreateRequest(BaseModel):
    category_key: str = Field(..., min_length=2, max_length=80)
    display_name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None
    base_safety_severity: float = Field(default=60.0, ge=10.0, le=100.0)
    default_sla_hours: int = Field(default=72, ge=6, le=720)


class CategoryUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    base_safety_severity: Optional[float] = Field(default=None, ge=10.0, le=100.0)
    default_sla_hours: Optional[int] = Field(default=None, ge=6, le=720)
    is_active: Optional[bool] = None


class AreaCreateRequest(BaseModel):
    area_name: str = Field(..., min_length=2, max_length=150)
    ward_code: str = Field(..., min_length=2, max_length=50)
    center_lat: float
    center_lng: float
    radius_meters: float = 2200.0
    verified_zone_tier: str = "urban_pilot"


class OfficerCreateRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    password: str = Field(..., min_length=6)
    department_id: str
    employee_id: str
    assigned_area_id: Optional[str] = None
    designation: str = "Field Engineer (Demo)"


class DepartmentCreateRequest(BaseModel):
    department_name: str
    department_code: str
    description: Optional[str] = None


class RecurrenceReviewRequest(BaseModel):
    review_status: str = Field(..., pattern="^(CONFIRMED|DISMISSED)$")


class NotificationOut(BaseModel):
    notification_id: str
    complaint_id: Optional[str]
    title: str
    message: str
    is_read: bool
    created_at: datetime


class PublicComplaintSerializer:
    """Explicit serializer guaranteeing reporter PII & internal officer remarks are NEVER exposed publicly."""

    @staticmethod
    def to_summary(complaint, current_user=None) -> Dict[str, Any]:
        import json

        before_imgs = [img.image_url for img in complaint.images if img.image_type == "BEFORE"]
        after_imgs = [img.image_url for img in complaint.images if img.image_type == "AFTER"]
        support_count = len(complaint.supports)
        user_supported = bool(
            current_user and any(s.user_id == current_user.user_id for s in complaint.supports)
        )

        explanation = None
        if complaint.priority_explanation:
            try:
                explanation = json.loads(complaint.priority_explanation)
            except Exception:
                explanation = {"summary": complaint.priority_explanation, "factors": []}

        return {
            "complaint_id": complaint.complaint_id,
            "reference_code": complaint.reference_code,
            "category": complaint.category,
            "description": complaint.description,
            "latitude": complaint.latitude,
            "longitude": complaint.longitude,
            "address_hint": complaint.address_hint,
            "area_id": complaint.area_id,
            "area_name": complaint.area.area_name if complaint.area else None,
            "department_id": complaint.department_id,
            "department_name": complaint.department.department_name if complaint.department else None,
            "department_code": complaint.department.department_code if complaint.department else None,
            "priority_score": round(float(complaint.priority_score or 0.0), 1),
            "priority_level": complaint.priority_level,
            "priority_summary": explanation.get("summary") if isinstance(explanation, dict) else None,
            "status": complaint.status,
            "anonymous": complaint.anonymous,
            "is_confidential": complaint.is_confidential,
            "classification_confidence": complaint.classification_confidence,
            "classification_mode": complaint.classification_mode,
            "ai_suggested_category": complaint.ai_suggested_category,
            "routing_reason": complaint.routing_reason,
            "routing_confidence": complaint.routing_confidence,
            "support_count": support_count,
            "user_has_supported": user_supported,
            "before_images": before_imgs,
            "after_images": after_imgs,
            "thumbnail_url": before_imgs[0] if before_imgs else None,
            "completion_requested_at": complaint.completion_requested_at.isoformat() if complaint.completion_requested_at else None,
            "completed_by": (
                {
                    "employee_id": complaint.assigned_officer.employee_id,
                    "designation": complaint.assigned_officer.designation,
                    "department_name": complaint.department.department_name if complaint.department else None,
                }
                if complaint.completion_requested_at and complaint.assigned_officer
                else None
            ),
            "due_at": complaint.due_at.isoformat() if complaint.due_at else None,
            "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
            "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None,
            "is_demo_data": True,
        }
