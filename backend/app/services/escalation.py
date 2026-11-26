from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from ..models import (
    AuditLog,
    Complaint,
    EscalationRecord,
    Notification,
    StatusHistory,
    User,
)
from .priority import recalculate_complaint_priority

ACTIVE_SLA_STATUSES = {"SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "REOPENED", "OVERDUE"}


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def run_escalation_sweep(db: Session) -> List[EscalationRecord]:
    """
    Checks unresolved complaints against their configurable due_at deadlines.
    Marks breached complaints as OVERDUE, creates EscalationRecord entries,
    notifies supervisors/admins and the assigned officer, and logs to StatusHistory.
    """
    now = datetime.now(timezone.utc)
    candidates = (
        db.query(Complaint)
        .filter(
            Complaint.status.in_(ACTIVE_SLA_STATUSES),
            Complaint.due_at.isnot(None),
        )
        .all()
    )

    created: List[EscalationRecord] = []
    admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()  # noqa: E712

    for c in candidates:
        due = _as_utc(c.due_at)
        if not due or due >= now:
            continue

        hours_overdue = (now - due).total_seconds() / 3600.0
        target_level = 1
        if hours_overdue >= 72:
            target_level = 3
        elif hours_overdue >= 24:
            target_level = 2

        existing_max_level = max((e.escalation_level for e in c.escalations), default=0)
        old_status = c.status

        if old_status != "OVERDUE":
            c.status = "OVERDUE"
            db.add(
                StatusHistory(
                    complaint_id=c.complaint_id,
                    old_status=old_status,
                    new_status="OVERDUE",
                    changed_by=None,
                    remarks=f"Deadline exceeded by {round(hours_overdue, 1)} hours. Complaint automatically marked OVERDUE.",
                )
            )
            recalculate_complaint_priority(db, c)

        if target_level > existing_max_level:
            reason = (
                f"SLA deadline ({due.strftime('%Y-%m-%d %H:%M UTC')}) exceeded by "
                f"{round(hours_overdue, 1)} hours. Escalated to Level {target_level} inside CivicTrack."
            )
            esc = EscalationRecord(
                complaint_id=c.complaint_id,
                escalation_level=target_level,
                reason=reason,
            )
            db.add(esc)
            created.append(esc)

            db.add(
                AuditLog(
                    actor_id=None,
                    action=f"ESCALATION_LEVEL_{target_level}",
                    entity_type="complaint",
                    entity_id=c.complaint_id,
                    details=reason,
                )
            )

            if c.assigned_officer and c.assigned_officer.user_id:
                db.add(
                    Notification(
                        user_id=c.assigned_officer.user_id,
                        complaint_id=c.complaint_id,
                        title=f"Overdue Complaint Escalation (L{target_level}): {c.reference_code}",
                        message=reason,
                    )
                )

            for adm in admins:
                db.add(
                    Notification(
                        user_id=adm.user_id,
                        complaint_id=c.complaint_id,
                        title=f"Supervisor Alert — Overdue L{target_level}: {c.reference_code}",
                        message=reason,
                    )
                )

    if created:
        db.commit()
    return created
