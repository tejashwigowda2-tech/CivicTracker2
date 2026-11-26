from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    AuditLog,
    Complaint,
    ComplaintSupport,
    Notification,
    StatusHistory,
    User,
    VerificationVote,
)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def get_verification_summary(db: Session, complaint: Complaint, current_user: User | None = None) -> Dict[str, Any]:
    votes = db.query(VerificationVote).filter(VerificationVote.complaint_id == complaint.complaint_id).all()
    confirmed_count = sum(1 for v in votes if v.vote == "WORK_COMPLETED")
    disputed_count = sum(1 for v in votes if v.vote == "ISSUE_STILL_EXISTS")
    total_votes = len(votes)
    confirm_pct = round((confirmed_count / total_votes) * 100.0, 1) if total_votes > 0 else 0.0

    # Eligible supporters: those who supported before completion was requested
    supports = db.query(ComplaintSupport).filter(ComplaintSupport.complaint_id == complaint.complaint_id).all()
    comp_req_at = _as_utc(complaint.completion_requested_at)
    eligible_user_ids = {
        s.user_id
        for s in supports
        if comp_req_at is None or (_as_utc(s.created_at) is not None and _as_utc(s.created_at) <= comp_req_at)
    }

    user_eligible = False
    user_has_voted = False
    user_vote = None
    if current_user:
        user_eligible = current_user.user_id in eligible_user_ids
        existing_vote = next((v for v in votes if v.user_id == current_user.user_id), None)
        if existing_vote:
            user_has_voted = True
            user_vote = existing_vote.vote

    return {
        "total_votes": total_votes,
        "confirmed_count": confirmed_count,
        "disputed_count": disputed_count,
        "confirm_percentage": confirm_pct,
        "min_votes_required": settings.VERIFICATION_MIN_VOTES,
        "pass_ratio_required": settings.VERIFICATION_PASS_RATIO,
        "eligible_supporters_count": len(eligible_user_ids),
        "user_is_eligible": user_eligible,
        "user_has_voted": user_has_voted,
        "user_vote": user_vote,
    }


def submit_verification_vote(
    db: Session,
    complaint: Complaint,
    user: User,
    vote_value: str,
) -> Dict[str, Any]:
    if complaint.status not in ("AWAITING_VERIFICATION", "DISPUTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification voting is only open when a complaint is awaiting verification.",
        )

    if vote_value not in ("WORK_COMPLETED", "ISSUE_STILL_EXISTS"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vote must be WORK_COMPLETED or ISSUE_STILL_EXISTS.",
        )

    # Check eligibility: citizen must have supported BEFORE completion was requested
    support = (
        db.query(ComplaintSupport)
        .filter(
            ComplaintSupport.complaint_id == complaint.complaint_id,
            ComplaintSupport.user_id == user.user_id,
        )
        .first()
    )
    if not support:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only citizens who supported this complaint before completion was requested are eligible to verify.",
        )

    comp_req_at = _as_utc(complaint.completion_requested_at)
    sup_at = _as_utc(support.created_at)
    if comp_req_at and sup_at and sup_at > comp_req_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support was recorded after completion was requested; only prior supporters can verify.",
        )

    existing = (
        db.query(VerificationVote)
        .filter(
            VerificationVote.complaint_id == complaint.complaint_id,
            VerificationVote.user_id == user.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a verification vote for this complaint.",
        )

    vote = VerificationVote(
        complaint_id=complaint.complaint_id,
        user_id=user.user_id,
        vote=vote_value,
    )
    db.add(vote)
    db.flush()

    summary = get_verification_summary(db, complaint, user)
    total_votes = summary["total_votes"]
    confirmed_count = summary["confirmed_count"]
    disputed_count = summary["disputed_count"]
    vote_label = "Yes, Work Completed" if vote_value == "WORK_COMPLETED" else "No, Issue Still Exists"

    # Always record a public timeline entry for every verification vote (without exposing voter identity)
    db.add(
        StatusHistory(
            complaint_id=complaint.complaint_id,
            old_status=complaint.status,
            new_status=complaint.status,
            changed_by=None,
            remarks=(
                f"Citizen verification vote recorded: \"{vote_label}\" "
                f"({confirmed_count} completed, {disputed_count} disputed; "
                f"{total_votes}/{settings.VERIFICATION_MIN_VOTES} minimum votes)."
            ),
        )
    )
    db.add(
        AuditLog(
            actor_id=user.user_id,
            action="VERIFICATION_VOTE_CAST",
            entity_type="complaint",
            entity_id=complaint.complaint_id,
            details=f"Vote '{vote_value}' cast ({confirmed_count} completed, {disputed_count} disputed).",
        )
    )

    if total_votes >= settings.VERIFICATION_MIN_VOTES:
        ratio = confirmed_count / total_votes
        old_status = complaint.status
        if ratio >= settings.VERIFICATION_PASS_RATIO:
            new_status = "RESOLVED_VERIFIED"
            complaint.resolved_at = datetime.now(timezone.utc)
            remarks = (
                f"Resolved – Citizen Verified: threshold reached ({confirmed_count}/{total_votes} confirmed work completed)."
            )
        else:
            new_status = "DISPUTED"
            remarks = (
                f"Verification disputed: {disputed_count}/{total_votes} reported issue still exists "
                f"(below {int(settings.VERIFICATION_PASS_RATIO * 100)}% completion threshold). Eligible for reopening."
            )

        if old_status != new_status:
            complaint.status = new_status
            db.add(
                StatusHistory(
                    complaint_id=complaint.complaint_id,
                    old_status=old_status,
                    new_status=new_status,
                    changed_by=None,
                    remarks=remarks,
                )
            )
            db.add(
                AuditLog(
                    actor_id=user.user_id,
                    action=f"VERIFICATION_{new_status}",
                    entity_type="complaint",
                    entity_id=complaint.complaint_id,
                    details=remarks,
                )
            )
            # Notify assigned officer and admins on dispute or verified resolution
            if complaint.assigned_officer and complaint.assigned_officer.user_id:
                db.add(
                    Notification(
                        user_id=complaint.assigned_officer.user_id,
                        complaint_id=complaint.complaint_id,
                        title=f"Verification Result: {complaint.reference_code}",
                        message=remarks,
                    )
                )
            if new_status == "DISPUTED":
                admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()  # noqa: E712
                for adm in admins:
                    db.add(
                        Notification(
                            user_id=adm.user_id,
                            complaint_id=complaint.complaint_id,
                            title=f"Verification Dispute: {complaint.reference_code}",
                            message=remarks,
                        )
                    )
            if complaint.reporter_id:
                db.add(
                    Notification(
                        user_id=complaint.reporter_id,
                        complaint_id=complaint.complaint_id,
                        title=f"Complaint {new_status.replace('_', ' ').title()}",
                        message=f"Complaint {complaint.reference_code}: {remarks}",
                    )
                )

    db.commit()
    db.refresh(complaint)
    return get_verification_summary(db, complaint, user)
