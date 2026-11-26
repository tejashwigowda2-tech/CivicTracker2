import json
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_current_user_optional, rate_limit_submission
from ..config import settings
from ..database import get_db
from ..models import (
    AuditLog,
    Complaint,
    ComplaintCategory,
    ComplaintImage,
    ComplaintSupport,
    Notification,
    StatusHistory,
    User,
)
from ..schemas import PublicComplaintSerializer, VerificationVoteRequest
from ..services.ai_classifier import classify_complaint
from ..services.duplicate import find_nearby_duplicates, haversine_meters
from ..services.priority import compute_priority, recalculate_complaint_priority
from ..services.recurrence import detect_and_link_recurrence, get_complaint_recurrence_summary
from ..services.routing import suggest_department_routing
from ..services.storage import store_image_bytes, validate_and_read_image
from ..services.verification import get_verification_summary, submit_verification_vote

router = APIRouter(tags=["Citizen Complaints"])


def _generate_reference_code(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(Complaint).count() + 1
    for _ in range(10):
        code = f"CT-{year}-{count:04d}"
        if not db.query(Complaint).filter(Complaint.reference_code == code).first():
            return code
        count += random.randint(1, 5)
    return f"CT-{year}-{random.randint(10000, 99999)}"


@router.get("/api/complaints/nearby")
def get_nearby_complaints(
    latitude: float = Query(...),
    longitude: float = Query(...),
    category: str = Query(...),
    description: str = Query(default=""),
    radius_meters: Optional[float] = Query(default=None),
    db: Session = Depends(get_db),
):
    matches = find_nearby_duplicates(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category=category,
        description=description,
        radius_meters=radius_meters,
    )
    return {
        "duplicate_detected": len(matches) > 0,
        "message": (
            "A similar issue has already been reported nearby. Support the existing complaint instead of creating a duplicate."
            if matches
            else "No similar active complaints found nearby."
        ),
        "matches": matches,
    }


@router.post("/api/complaints", status_code=status.HTTP_201_CREATED)
def create_complaint(
    category: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(default=""),
    address_hint: str = Form(default=""),
    area_id: Optional[str] = Form(default=None),
    anonymous: bool = Form(default=False),
    is_confidential: bool = Form(default=False),
    confidential_contact: Optional[str] = Form(default=None),
    image: Optional[UploadFile] = File(default=None),
    _: None = Depends(rate_limit_submission),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GPS coordinates.")

    # Validate category exists & active
    cat_obj = (
        db.query(ComplaintCategory)
        .filter(ComplaintCategory.category_key == category, ComplaintCategory.is_active == True)  # noqa: E712
        .first()
    )
    if not cat_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported or inactive category '{category}'.")

    image_bytes = None
    image_ext = None
    filename = ""
    if image is not None:
        image_bytes, image_ext = validate_and_read_image(image)
        filename = image.filename or ""

    # 1. AI classification / transparent fallback
    ai_result = classify_complaint(description=description, filename=filename, image_bytes=image_bytes)

    # 2. Hybrid department routing
    routing = suggest_department_routing(
        db=db,
        category=category,
        latitude=latitude,
        longitude=longitude,
        area_id=area_id or None,
    )

    resolved_area_id = routing.get("area_id")
    dept_id = routing.get("department_id")
    officer_id = routing.get("assigned_officer_id")
    requires_review = routing.get("requires_admin_review", True)

    initial_status = "UNDER_REVIEW" if requires_review else "ASSIGNED"
    sla_hours = cat_obj.default_sla_hours or settings.DEFAULT_SLA_HOURS
    now = datetime.now(timezone.utc)
    due_at = now + timedelta(hours=sla_hours)

    # Anonymous complaints MUST store reporter_id = None
    reporter_id = None if anonymous else (current_user.user_id if current_user else None)

    # Confidential contact info is stored privately and never exposed publicly
    private_contact = confidential_contact.strip() if (is_confidential and confidential_contact) else None

    ref_code = _generate_reference_code(db)
    complaint = Complaint(
        reference_code=ref_code,
        reporter_id=reporter_id,
        category=category,
        description=description.strip() if description else None,
        latitude=latitude,
        longitude=longitude,
        address_hint=address_hint.strip() if address_hint else (routing.get("area_name") or "Reported Location"),
        area_id=resolved_area_id,
        department_id=dept_id,
        assigned_officer_id=officer_id,
        status=initial_status,
        anonymous=anonymous,
        is_confidential=is_confidential,
        confidential_contact=private_contact,
        classification_confidence=ai_result.get("confidence", 0.0),
        classification_mode=ai_result.get("mode", "heuristic_fallback"),
        ai_suggested_category=ai_result.get("suggested_category"),
        routing_reason=routing.get("reason"),
        routing_confidence=routing.get("confidence", 0.0),
        due_at=due_at,
        created_at=now,
    )
    db.add(complaint)
    db.flush()

    # Store uploaded BEFORE photo if provided
    if image_bytes and image_ext:
        img_url = store_image_bytes(image_bytes, image_ext, prefix="before")
        db.add(
            ComplaintImage(
                complaint_id=complaint.complaint_id,
                image_url=img_url,
                image_type="BEFORE",
                uploaded_by=reporter_id,
            )
        )

    # Auto-add reporter as initial supporter if authenticated and not anonymous
    if reporter_id:
        db.add(ComplaintSupport(complaint_id=complaint.complaint_id, user_id=reporter_id))

    # 3. Civic Issue Memory: detect recurring historical issues nearby
    recurrence_links = detect_and_link_recurrence(db, complaint)
    db.flush()

    # 4. Explainable priority scoring
    prio = compute_priority(
        db=db,
        category=category,
        description=description,
        severity_hint=ai_result.get("severity_hint"),
        support_count=1 if reporter_id else 0,
        recurrence_count=len(recurrence_links),
        area_id=resolved_area_id,
        created_at=now,
        status=initial_status,
    )
    complaint.priority_score = prio["priority_score"]
    complaint.priority_level = prio["priority_level"]
    complaint.priority_explanation = prio["priority_explanation"]

    # 5. Public Accountability Timeline entries
    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status=None,
            new_status="SUBMITTED",
            changed_by=reporter_id,
            remarks=(
                f"Complaint submitted ({'anonymous' if anonymous else 'authenticated'}). "
                f"Classification ({ai_result.get('mode')}): suggested {ai_result.get('suggested_category')} "
                f"({int((ai_result.get('confidence') or 0) * 100)}% confidence)."
            ),
            changed_at=now,
        )
    )
    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status="SUBMITTED",
            new_status=initial_status,
            changed_by=None,
            remarks=routing.get("reason"),
            changed_at=now + timedelta(seconds=1),
        )
    )
    db.add(
        AuditLog(
            actor_id=reporter_id,
            action="COMPLAINT_CREATED",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=f"Reference {ref_code} created with status {initial_status}.",
        )
    )

    # 6. Notifications
    if reporter_id:
        db.add(
            Notification(
                user_id=reporter_id,
                complaint_id=complaint.complaint_id,
                title=f"Complaint Submitted: {ref_code}",
                message=f"Your report has been logged with reference {ref_code}. Current status: {initial_status}.",
            )
        )
    if officer_id and complaint.assigned_officer and complaint.assigned_officer.user_id:
        db.add(
            Notification(
                user_id=complaint.assigned_officer.user_id,
                complaint_id=complaint.complaint_id,
                title=f"New Assigned Complaint ({complaint.priority_level}): {ref_code}",
                message=f"{cat_obj.display_name} reported in {routing.get('area_name')}.",
            )
        )
    if requires_review or complaint.priority_level in ("High", "Critical"):
        admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()  # noqa: E712
        for adm in admins:
            db.add(
                Notification(
                    user_id=adm.user_id,
                    complaint_id=complaint.complaint_id,
                    title=f"{'Routing Review Needed' if requires_review else 'High-Priority Issue'}: {ref_code}",
                    message=routing.get("reason") or f"Priority {complaint.priority_level} complaint reported.",
                )
            )

    db.commit()
    db.refresh(complaint)

    summary = PublicComplaintSerializer.to_summary(complaint, current_user)
    summary["recurrence"] = get_complaint_recurrence_summary(db, complaint.complaint_id)
    summary["ai_classification"] = ai_result
    return summary


@router.get("/api/complaints")
def list_complaints(
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    area_id: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority_level: Optional[str] = Query(default=None),
    sort: str = Query(default="newest"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint)

    if category:
        query = query.filter(Complaint.category == category)
    if area_id:
        query = query.filter(Complaint.area_id == area_id)
    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if priority_level:
        query = query.filter(Complaint.priority_level == priority_level)
    if search:
        like_term = f"%{search.strip()}%"
        query = query.filter(
            (Complaint.reference_code.ilike(like_term))
            | (Complaint.description.ilike(like_term))
            | (Complaint.address_hint.ilike(like_term))
        )

    if sort == "oldest":
        query = query.order_by(Complaint.created_at.asc())
    elif sort == "highest_priority":
        query = query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc())
    else:
        query = query.order_by(Complaint.created_at.desc())

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    results = []
    for c in items:
        s = PublicComplaintSerializer.to_summary(c, current_user)
        rec = get_complaint_recurrence_summary(db, c.complaint_id)
        s["is_recurring"] = rec["is_recurring"]
        s["recurrence_count"] = rec["recurrence_count"]
        results.append(s)

    return {
        "total": total,
        "items": results,
    }


@router.get("/api/complaints/{complaint_id}")
def get_complaint_detail(
    complaint_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Support lookup by UUID or reference_code
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.reference_code == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    data = PublicComplaintSerializer.to_summary(complaint, current_user)

    # Full priority breakdown
    if complaint.priority_explanation:
        try:
            data["priority_breakdown"] = json.loads(complaint.priority_explanation)
        except Exception:
            data["priority_breakdown"] = None
    else:
        data["priority_breakdown"] = None

    # Detailed image metadata (without exposing private uploader PII)
    data["image_records"] = [
        {
            "image_id": img.image_id,
            "image_url": img.image_url,
            "image_type": img.image_type,
            "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None,
        }
        for img in sorted(complaint.images, key=lambda i: i.uploaded_at)
    ]

    # Public Accountability Timeline (never exposes private user names or internal officer notes)
    data["timeline"] = [
        {
            "history_id": h.history_id,
            "old_status": h.old_status,
            "new_status": h.new_status,
            "remarks": h.remarks,
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
        }
        for h in sorted(complaint.status_history, key=lambda x: x.changed_at)
    ]

    # Verification summary
    data["verification"] = get_verification_summary(db, complaint, current_user)

    # Civic Issue Memory (Recurrence history)
    data["recurrence"] = get_complaint_recurrence_summary(db, complaint.complaint_id)

    # Escalations
    data["escalations"] = [
        {
            "escalation_id": e.escalation_id,
            "escalation_level": e.escalation_level,
            "reason": e.reason,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in sorted(complaint.escalations, key=lambda x: x.created_at)
    ]

    # Related nearby historical complaints in same category (within 250m)
    nearby_all = (
        db.query(Complaint)
        .filter(
            Complaint.complaint_id != complaint.complaint_id,
            Complaint.category == complaint.category,
        )
        .all()
    )
    related = []
    for other in nearby_all:
        dist = haversine_meters(complaint.latitude, complaint.longitude, other.latitude, other.longitude)
        if dist <= 300:
            related.append(
                {
                    "complaint_id": other.complaint_id,
                    "reference_code": other.reference_code,
                    "status": other.status,
                    "distance_meters": round(dist, 1),
                    "created_at": other.created_at.isoformat() if other.created_at else None,
                    "resolved_at": other.resolved_at.isoformat() if other.resolved_at else None,
                }
            )
    related.sort(key=lambda r: r["distance_meters"])
    data["related_historical_complaints"] = related[:5]

    return data


@router.post("/api/complaints/{complaint_id}/support")
def support_complaint(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authenticated citizen accounts can support complaints.",
        )

    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    existing = (
        db.query(ComplaintSupport)
        .filter(
            ComplaintSupport.complaint_id == complaint.complaint_id,
            ComplaintSupport.user_id == current_user.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already supported this complaint.",
        )

    db.add(ComplaintSupport(complaint_id=complaint.complaint_id, user_id=current_user.user_id))
    db.flush()

    recalculate_complaint_priority(db, complaint)
    db.add(
        AuditLog(
            actor_id=current_user.user_id,
            action="COMPLAINT_SUPPORTED",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=f"Community support added; priority score updated to {complaint.priority_score}.",
        )
    )
    db.commit()
    db.refresh(complaint)

    return {
        "complaint_id": complaint.complaint_id,
        "support_count": len(complaint.supports),
        "priority_score": complaint.priority_score,
        "priority_level": complaint.priority_level,
        "user_has_supported": True,
    }


@router.post("/api/complaints/{complaint_id}/verify")
def verify_complaint(
    complaint_id: str,
    payload: VerificationVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    return submit_verification_vote(db=db, complaint=complaint, user=current_user, vote_value=payload.vote)
