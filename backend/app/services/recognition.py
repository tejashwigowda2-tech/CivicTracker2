from datetime import timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from ..models import Complaint, Officer, Recognition, RecurrenceLink, VerificationVote


def _as_utc(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def calculate_officer_performance(db: Session, officer: Officer) -> Dict[str, Any]:
    assigned = db.query(Complaint).filter(Complaint.assigned_officer_id == officer.officer_id).all()
    total_assigned = len(assigned)
    pending = sum(1 for c in assigned if c.status in ("ASSIGNED", "UNDER_REVIEW", "SUBMITTED", "REOPENED"))
    in_progress = sum(1 for c in assigned if c.status == "IN_PROGRESS")
    awaiting_verification = sum(1 for c in assigned if c.status == "AWAITING_VERIFICATION")
    overdue = sum(1 for c in assigned if c.status == "OVERDUE")
    verified_resolved = sum(1 for c in assigned if c.status == "RESOLVED_VERIFIED")
    disputed = sum(1 for c in assigned if c.status == "DISPUTED")

    # Average acknowledgement time (ASSIGNED -> IN_PROGRESS) in hours
    ack_hours: List[float] = []
    res_hours: List[float] = []
    for c in assigned:
        hist = sorted(c.status_history, key=lambda h: h.changed_at)
        assigned_at = next((_as_utc(h.changed_at) for h in hist if h.new_status == "ASSIGNED"), _as_utc(c.created_at))
        started_at = next((_as_utc(h.changed_at) for h in hist if h.new_status == "IN_PROGRESS"), None)
        if assigned_at and started_at and started_at >= assigned_at:
            ack_hours.append((started_at - assigned_at).total_seconds() / 3600.0)
        if c.resolved_at and c.created_at:
            r_at = _as_utc(c.resolved_at)
            c_at = _as_utc(c.created_at)
            if r_at and c_at and r_at >= c_at:
                res_hours.append((r_at - c_at).total_seconds() / 3600.0)

    avg_ack = round(sum(ack_hours) / len(ack_hours), 1) if ack_hours else 0.0
    avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

    # Verified resolution rate among completed attempts (verified + disputed + awaiting)
    completed_pool = verified_resolved + disputed
    verified_rate = round((verified_resolved / completed_pool) * 100.0, 1) if completed_pool > 0 else (100.0 if verified_resolved > 0 else 0.0)

    # Citizen verification vote approval %
    complaint_ids = [c.complaint_id for c in assigned]
    votes = (
        db.query(VerificationVote).filter(VerificationVote.complaint_id.in_(complaint_ids)).all()
        if complaint_ids
        else []
    )
    pos_votes = sum(1 for v in votes if v.vote == "WORK_COMPLETED")
    neg_votes = sum(1 for v in votes if v.vote == "ISSUE_STILL_EXISTS")
    citizen_approval_pct = round((pos_votes / len(votes)) * 100.0, 1) if votes else 0.0

    # Recurring rate on previously handled locations
    recurrence_hits = (
        db.query(RecurrenceLink)
        .filter(
            RecurrenceLink.previous_complaint_id.in_(complaint_ids),
            RecurrenceLink.review_status != "DISMISSED",
        )
        .count()
        if complaint_ids
        else 0
    )
    recurrence_rate = round((recurrence_hits / verified_resolved) * 100.0, 1) if verified_resolved > 0 else 0.0

    # Quality-based Recognition Badges (explicitly never awarded solely for closing volume)
    stored_badges = db.query(Recognition).filter(Recognition.officer_id == officer.officer_id).all()
    badges = [
        {
            "badge_name": b.badge_name,
            "reason": b.reason,
            "awarded_at": b.awarded_at.isoformat() if b.awarded_at else None,
        }
        for b in stored_badges
    ]

    return {
        "officer_id": officer.officer_id,
        "employee_id": officer.employee_id,
        "full_name": officer.user.full_name if officer.user else "Demo Officer",
        "designation": officer.designation,
        "department_name": officer.department.department_name if officer.department else None,
        "department_code": officer.department.department_code if officer.department else None,
        "assigned_area_name": officer.assigned_area.area_name if officer.assigned_area else None,
        "total_assigned": total_assigned,
        "pending": pending,
        "in_progress": in_progress,
        "awaiting_verification": awaiting_verification,
        "overdue": overdue,
        "verified_resolved": verified_resolved,
        "disputed": disputed,
        "avg_acknowledgement_hours": avg_ack,
        "avg_resolution_hours": avg_res,
        "verified_resolution_rate_pct": verified_rate,
        "citizen_positive_votes": pos_votes,
        "citizen_dispute_votes": neg_votes,
        "citizen_approval_pct": citizen_approval_pct,
        "recurring_issue_rate_pct": recurrence_rate,
        "badges": badges,
        "is_demo_data": True,
    }
