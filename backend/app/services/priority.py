import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from ..models import Area, Complaint, ComplaintCategory, RecurrenceLink

WEIGHTS = {
    "safety_severity": 0.35,
    "time_unresolved": 0.20,
    "community_support": 0.20,
    "recurrence_history": 0.15,
    "location_risk": 0.10,
}

SEVERITY_SCORES = {
    "Critical": 95.0,
    "High": 80.0,
    "Medium": 55.0,
    "Low": 30.0,
}


def compute_priority(
    db: Session,
    category: str,
    description: str = "",
    severity_hint: Optional[str] = None,
    support_count: int = 0,
    recurrence_count: int = 0,
    area_id: Optional[str] = None,
    created_at: Optional[datetime] = None,
    status: str = "SUBMITTED",
) -> Dict[str, Any]:
    # 1. Safety severity (0-100) * 35%
    cat_row = db.query(ComplaintCategory).filter(ComplaintCategory.category_key == category).first()
    base_safety = float(cat_row.base_safety_severity) if cat_row else 60.0
    if severity_hint and severity_hint in SEVERITY_SCORES:
        safety_raw = 0.55 * base_safety + 0.45 * SEVERITY_SCORES[severity_hint]
    else:
        safety_raw = base_safety

    desc_lower = (description or "").lower()
    if any(w in desc_lower for w in ["accident", "open manhole", "collapsed", "dangerous", "deep", "injury", "flood"]):
        safety_raw = min(100.0, safety_raw + 15.0)
    safety_raw = round(min(100.0, max(10.0, safety_raw)), 1)

    # 2. Time unresolved (0-100) * 20%
    now = datetime.now(timezone.utc)
    if status == "RESOLVED_VERIFIED":
        time_raw = 0.0
    else:
        if created_at is None:
            hours_open = 0.0
        else:
            c_at = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
            hours_open = max(0.0, (now - c_at).total_seconds() / 3600.0)
        # Reaches 100 at 144 hours (6 days) unresolved; OVERDUE boosts floor to 75
        time_raw = min(100.0, (hours_open / 144.0) * 100.0)
        if status == "OVERDUE":
            time_raw = max(time_raw, 80.0)
    time_raw = round(time_raw, 1)

    # 3. Community support (0-100) * 20%
    # Logarithmic/diminishing scale so popularity alone never dominates safety & recurrence
    support_raw = round(min(100.0, support_count * 12.5), 1)

    # 4. Recurrence history (0-100) * 15%
    if recurrence_count <= 0:
        recurrence_raw = 0.0
    elif recurrence_count == 1:
        recurrence_raw = 65.0
    else:
        recurrence_raw = min(100.0, 65.0 + (recurrence_count - 1) * 20.0)
    recurrence_raw = round(recurrence_raw, 1)

    # 5. Location risk (0-100) * 10%
    # Strictly uses verified available geographic metadata (whether located inside a mapped pilot ward & ward context)
    location_raw = 35.0
    area_note = "Coordinates recorded outside configured demonstration pilot boundaries."
    if area_id:
        area = db.query(Area).filter(Area.area_id == area_id).first()
        if area:
            boundary = area.boundary_data or {}
            verified_density_tier = boundary.get("verified_zone_tier", "urban_pilot")
            if verified_density_tier == "high_footfall_pilot":
                location_raw = 75.0
                area_note = f"Verified within demonstration pilot zone ({area.area_name}, {area.ward_code})."
            else:
                location_raw = 55.0
                area_note = f"Verified within demonstration pilot zone ({area.area_name}, {area.ward_code})."

    weighted_score = (
        safety_raw * WEIGHTS["safety_severity"]
        + time_raw * WEIGHTS["time_unresolved"]
        + support_raw * WEIGHTS["community_support"]
        + recurrence_raw * WEIGHTS["recurrence_history"]
        + location_raw * WEIGHTS["location_risk"]
    )
    score = round(min(100.0, max(0.0, weighted_score)), 1)

    if score >= 78.0:
        level = "Critical"
    elif score >= 58.0:
        level = "High"
    elif score >= 35.0:
        level = "Medium"
    else:
        level = "Low"

    reasons = []
    if safety_raw >= 70:
        reasons.append("it poses an elevated public safety risk")
    if time_raw >= 45:
        reasons.append("it has remained unresolved for an extended duration")
    if recurrence_raw >= 50:
        reasons.append("this location has recurring infrastructure history")
    if support_raw >= 40:
        reasons.append(f"multiple citizens ({support_count}) have corroborated the issue")
    if not reasons:
        reasons.append("standard baseline severity and verified pilot-zone parameters apply")

    summary = f"This issue has {level.lower()} priority (score {score}/100) because " + ", and ".join(reasons) + "."

    breakdown = {
        "summary": summary,
        "score": score,
        "level": level,
        "factors": [
            {"name": "Safety Severity", "weight_pct": 35, "raw_score": safety_raw, "weighted_contribution": round(safety_raw * 0.35, 1)},
            {"name": "Time Unresolved", "weight_pct": 20, "raw_score": time_raw, "weighted_contribution": round(time_raw * 0.20, 1)},
            {"name": "Community Support", "weight_pct": 20, "raw_score": support_raw, "weighted_contribution": round(support_raw * 0.20, 1)},
            {"name": "Recurrence History", "weight_pct": 15, "raw_score": recurrence_raw, "weighted_contribution": round(recurrence_raw * 0.15, 1)},
            {"name": "Location Risk (Verified Geo)", "weight_pct": 10, "raw_score": location_raw, "weighted_contribution": round(location_raw * 0.10, 1), "note": area_note},
        ],
    }
    return {
        "priority_score": score,
        "priority_level": level,
        "priority_explanation": json.dumps(breakdown),
        "breakdown": breakdown,
    }


def recalculate_complaint_priority(db: Session, complaint: Complaint) -> Complaint:
    recurrence_count = (
        db.query(RecurrenceLink)
        .filter(
            RecurrenceLink.new_complaint_id == complaint.complaint_id,
            RecurrenceLink.review_status != "DISMISSED",
        )
        .count()
    )
    support_count = len(complaint.supports)
    res = compute_priority(
        db=db,
        category=complaint.category,
        description=complaint.description or "",
        severity_hint=None,
        support_count=support_count,
        recurrence_count=recurrence_count,
        area_id=complaint.area_id,
        created_at=complaint.created_at,
        status=complaint.status,
    )
    complaint.priority_score = res["priority_score"]
    complaint.priority_level = res["priority_level"]
    complaint.priority_explanation = res["priority_explanation"]
    return complaint
