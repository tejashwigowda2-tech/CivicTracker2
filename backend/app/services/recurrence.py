from typing import Any, Dict, List

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Complaint, RecurrenceLink
from .duplicate import haversine_meters


def detect_and_link_recurrence(db: Session, new_complaint: Complaint) -> List[RecurrenceLink]:
    """
    Civic Issue Memory:
    Checks historical complaints (especially resolved/verified/disputed/older issues) within
    RECURRENCE_RADIUS_METERS matching the same category. Never deletes or overwrites historical records.
    Creates RecurrenceLink records flagged for transparency & optional administrator review.
    """
    radius = settings.RECURRENCE_RADIUS_METERS
    historical_candidates = (
        db.query(Complaint)
        .filter(
            Complaint.complaint_id != new_complaint.complaint_id,
            Complaint.category == new_complaint.category,
            Complaint.status.in_(["RESOLVED_VERIFIED", "DISPUTED", "AWAITING_VERIFICATION", "REOPENED"]),
        )
        .order_by(Complaint.created_at.desc())
        .all()
    )

    created_links: List[RecurrenceLink] = []
    for old_c in historical_candidates:
        dist = haversine_meters(new_complaint.latitude, new_complaint.longitude, old_c.latitude, old_c.longitude)
        if dist <= radius:
            existing = (
                db.query(RecurrenceLink)
                .filter(
                    RecurrenceLink.previous_complaint_id == old_c.complaint_id,
                    RecurrenceLink.new_complaint_id == new_complaint.complaint_id,
                )
                .first()
            )
            if existing:
                continue

            reason = (
                f"Same category ({new_complaint.category}) reported {round(dist, 1)}m from "
                f"historical complaint {old_c.reference_code} (status: {old_c.status})."
            )
            link = RecurrenceLink(
                previous_complaint_id=old_c.complaint_id,
                new_complaint_id=new_complaint.complaint_id,
                similarity_reason=reason,
                review_status="PENDING_REVIEW" if dist > 35 else "CONFIRMED",
            )
            db.add(link)
            created_links.append(link)
            # Link to up to 3 closest historical complaints
            if len(created_links) >= 3:
                break

    return created_links


def get_complaint_recurrence_summary(db: Session, complaint_id: str) -> Dict[str, Any]:
    links_as_new = (
        db.query(RecurrenceLink)
        .filter(
            RecurrenceLink.new_complaint_id == complaint_id,
            RecurrenceLink.review_status != "DISMISSED",
        )
        .all()
    )
    links_as_prev = (
        db.query(RecurrenceLink)
        .filter(
            RecurrenceLink.previous_complaint_id == complaint_id,
            RecurrenceLink.review_status != "DISMISSED",
        )
        .all()
    )

    previous_issues = []
    for lnk in links_as_new:
        prev = db.query(Complaint).filter(Complaint.complaint_id == lnk.previous_complaint_id).first()
        if prev:
            previous_issues.append(
                {
                    "recurrence_id": lnk.recurrence_id,
                    "complaint_id": prev.complaint_id,
                    "reference_code": prev.reference_code,
                    "status": prev.status,
                    "reported_at": prev.created_at.isoformat() if prev.created_at else None,
                    "resolved_at": prev.resolved_at.isoformat() if prev.resolved_at else None,
                    "similarity_reason": lnk.similarity_reason,
                    "review_status": lnk.review_status,
                }
            )

    subsequent_issues = []
    for lnk in links_as_prev:
        nxt = db.query(Complaint).filter(Complaint.complaint_id == lnk.new_complaint_id).first()
        if nxt:
            subsequent_issues.append(
                {
                    "recurrence_id": lnk.recurrence_id,
                    "complaint_id": nxt.complaint_id,
                    "reference_code": nxt.reference_code,
                    "status": nxt.status,
                    "reported_at": nxt.created_at.isoformat() if nxt.created_at else None,
                    "similarity_reason": lnk.similarity_reason,
                    "review_status": lnk.review_status,
                }
            )

    is_recurring = len(previous_issues) > 0 or len(subsequent_issues) > 0
    return {
        "is_recurring": is_recurring,
        "recurrence_count": len(previous_issues) + len(subsequent_issues),
        "previous_issues": previous_issues,
        "subsequent_issues": subsequent_issues,
    }
