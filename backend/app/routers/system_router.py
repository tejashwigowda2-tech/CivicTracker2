from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Area,
    Complaint,
    ComplaintCategory,
    EscalationRecord,
    Notification,
    RecurrenceLink,
    User,
)
from ..schemas import PriorityCalculateRequest, RoutingSuggestRequest
from ..services.ai_classifier import classify_complaint
from ..services.priority import compute_priority
from ..services.routing import suggest_department_routing
from ..services.storage import validate_and_read_image

router = APIRouter(tags=["System, AI & Public Reference"])


@router.get("/api/areas")
def list_areas(db: Session = Depends(get_db)):
    areas = db.query(Area).filter(Area.is_active == True).order_by(Area.area_name.asc()).all()  # noqa: E712
    return {
        "is_demo_data": True,
        "note": "Demonstration Bengaluru pilot zones (sample boundaries for hackathon prototype; not official municipal GIS).",
        "areas": [
            {
                "area_id": a.area_id,
                "area_name": a.area_name,
                "ward_code": a.ward_code,
                "boundary_data": a.boundary_data,
                "is_active": a.is_active,
            }
            for a in areas
        ],
    }


@router.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = (
        db.query(ComplaintCategory)
        .filter(ComplaintCategory.is_active == True)  # noqa: E712
        .order_by(ComplaintCategory.created_at.asc())
        .all()
    )
    return {
        "categories": [
            {
                "category_id": c.category_id,
                "category_key": c.category_key,
                "display_name": c.display_name,
                "description": c.description,
                "base_safety_severity": c.base_safety_severity,
                "default_sla_hours": c.default_sla_hours,
            }
            for c in cats
        ]
    }


@router.get("/api/stats")
def get_public_stats(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    resolved_verified = db.query(Complaint).filter(Complaint.status == "RESOLVED_VERIFIED").count()
    awaiting_verification = db.query(Complaint).filter(Complaint.status == "AWAITING_VERIFICATION").count()
    overdue = db.query(Complaint).filter(Complaint.status == "OVERDUE").count()
    disputed = db.query(Complaint).filter(Complaint.status == "DISPUTED").count()
    pending = (
        db.query(Complaint)
        .filter(Complaint.status.in_(["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "OVERDUE", "REOPENED", "DISPUTED"]))
        .count()
    )
    recurring_links = (
        db.query(RecurrenceLink)
        .filter(RecurrenceLink.review_status != "DISMISSED")
        .all()
    )
    recurring_complaint_ids = {l.new_complaint_id for l in recurring_links} | {l.previous_complaint_id for l in recurring_links}

    return {
        "total_complaints": total,
        "resolved_verified": resolved_verified,
        "awaiting_verification": awaiting_verification,
        "pending_complaints": pending,
        "overdue_complaints": overdue,
        "disputed_complaints": disputed,
        "recurring_issues_count": len(recurring_complaint_ids),
        "recurrence_links_count": len(recurring_links),
        "is_demo_data": True,
    }


@router.get("/api/notifications")
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(40)
        .all()
    )
    unread_count = sum(1 for r in rows if not r.is_read)
    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "notification_id": r.notification_id,
                "complaint_id": r.complaint_id,
                "title": r.title,
                "message": r.message,
                "is_read": r.is_read,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id,
            Notification.user_id == current_user.user_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"status": "ok"}


@router.post("/api/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}


@router.post("/api/ai/classify")
def ai_classify_endpoint(
    description: str = Form(default=""),
    image: Optional[UploadFile] = File(default=None),
):
    image_bytes = None
    filename = ""
    if image is not None:
        image_bytes, _ = validate_and_read_image(image)
        filename = image.filename or ""
    return classify_complaint(description=description, filename=filename, image_bytes=image_bytes)


@router.post("/api/routing/suggest")
def suggest_routing_endpoint(
    payload: RoutingSuggestRequest,
    db: Session = Depends(get_db),
):
    return suggest_department_routing(
        db=db,
        category=payload.category,
        latitude=payload.latitude,
        longitude=payload.longitude,
        area_id=payload.area_id,
    )


@router.post("/api/priority/calculate")
def calculate_priority_endpoint(
    payload: PriorityCalculateRequest,
    db: Session = Depends(get_db),
):
    res = compute_priority(
        db=db,
        category=payload.category,
        description=payload.description or "",
        severity_hint=payload.severity_hint,
        support_count=payload.support_count,
        recurrence_count=payload.recurrence_count,
        area_id=payload.area_id,
    )
    return res["breakdown"]


@router.get("/api/recurring-issues")
def list_recurring_issues(db: Session = Depends(get_db)):
    links = (
        db.query(RecurrenceLink)
        .filter(RecurrenceLink.review_status != "DISMISSED")
        .order_by(RecurrenceLink.created_at.desc())
        .all()
    )

    items = []
    hotspot_clusters: dict[str, dict] = {}
    for lnk in links:
        prev_c = db.query(Complaint).filter(Complaint.complaint_id == lnk.previous_complaint_id).first()
        new_c = db.query(Complaint).filter(Complaint.complaint_id == lnk.new_complaint_id).first()
        if not prev_c or not new_c:
            continue

        items.append(
            {
                "recurrence_id": lnk.recurrence_id,
                "similarity_reason": lnk.similarity_reason,
                "review_status": lnk.review_status,
                "created_at": lnk.created_at.isoformat() if lnk.created_at else None,
                "previous_complaint": {
                    "complaint_id": prev_c.complaint_id,
                    "reference_code": prev_c.reference_code,
                    "category": prev_c.category,
                    "address_hint": prev_c.address_hint,
                    "status": prev_c.status,
                    "created_at": prev_c.created_at.isoformat() if prev_c.created_at else None,
                    "resolved_at": prev_c.resolved_at.isoformat() if prev_c.resolved_at else None,
                    "latitude": prev_c.latitude,
                    "longitude": prev_c.longitude,
                },
                "new_complaint": {
                    "complaint_id": new_c.complaint_id,
                    "reference_code": new_c.reference_code,
                    "category": new_c.category,
                    "address_hint": new_c.address_hint,
                    "area_name": new_c.area.area_name if new_c.area else None,
                    "status": new_c.status,
                    "priority_level": new_c.priority_level,
                    "priority_score": new_c.priority_score,
                    "created_at": new_c.created_at.isoformat() if new_c.created_at else None,
                    "latitude": new_c.latitude,
                    "longitude": new_c.longitude,
                },
            }
        )

        cluster_key = f"{round(new_c.latitude, 3)}_{round(new_c.longitude, 3)}_{new_c.category}"
        if cluster_key not in hotspot_clusters:
            hotspot_clusters[cluster_key] = {
                "cluster_key": cluster_key,
                "category": new_c.category,
                "area_name": new_c.area.area_name if new_c.area else "Bengaluru Pilot",
                "address_hint": new_c.address_hint,
                "latitude": new_c.latitude,
                "longitude": new_c.longitude,
                "occurrences": 1,
                "complaint_refs": [prev_c.reference_code],
            }
        if new_c.reference_code not in hotspot_clusters[cluster_key]["complaint_refs"]:
            hotspot_clusters[cluster_key]["complaint_refs"].append(new_c.reference_code)
            hotspot_clusters[cluster_key]["occurrences"] = len(hotspot_clusters[cluster_key]["complaint_refs"])

    return {
        "total_recurrence_links": len(items),
        "recurring_issues": items,
        "hotspots": list(hotspot_clusters.values()),
        "is_demo_data": True,
    }


@router.get("/api/escalations")
def list_public_escalations(db: Session = Depends(get_db)):
    records = db.query(EscalationRecord).order_by(EscalationRecord.created_at.desc()).limit(50).all()
    return {
        "total": len(records),
        "note": "Escalations are tracked transparently inside CivicTrack; CivicTrack does not enforce external government authority actions.",
        "escalations": [
            {
                "escalation_id": e.escalation_id,
                "complaint_id": e.complaint_id,
                "reference_code": e.complaint.reference_code if e.complaint else None,
                "category": e.complaint.category if e.complaint else None,
                "area_name": e.complaint.area.area_name if e.complaint and e.complaint.area else None,
                "status": e.complaint.status if e.complaint else None,
                "escalation_level": e.escalation_level,
                "reason": e.reason,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in records
        ],
    }
