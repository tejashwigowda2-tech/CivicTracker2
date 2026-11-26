from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from ..models import Area, Department, JurisdictionMapping, Officer
from .duplicate import haversine_meters


def detect_pilot_area(db: Session, latitude: float, longitude: float, explicit_area_id: Optional[str] = None) -> Optional[Area]:
    if explicit_area_id:
        area = db.query(Area).filter(Area.area_id == explicit_area_id, Area.is_active == True).first()  # noqa: E712
        if area:
            return area

    areas = db.query(Area).filter(Area.is_active == True).all()  # noqa: E712
    best_area: Optional[Area] = None
    best_dist = float("inf")

    for area in areas:
        b = area.boundary_data or {}
        c_lat = b.get("center_lat")
        c_lng = b.get("center_lng")
        radius_m = float(b.get("radius_meters", 2500))
        if c_lat is not None and c_lng is not None:
            dist = haversine_meters(latitude, longitude, float(c_lat), float(c_lng))
            if dist <= radius_m and dist < best_dist:
                best_dist = dist
                best_area = area

    return best_area


def suggest_department_routing(
    db: Session,
    category: str,
    latitude: float,
    longitude: float,
    area_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Hybrid Department Routing using configurable sample jurisdiction mappings.
    Never assumes all infrastructure in an area belongs to a single agency.
    High-confidence matches can auto-enter the demo department queue; low-confidence or
    ambiguous matches route to Administrator Review (UNDER_REVIEW).
    """
    area = detect_pilot_area(db, latitude, longitude, area_id)
    if not area:
        return {
            "area_id": None,
            "area_name": "Outside Configured Pilot Zones",
            "department_id": None,
            "department_name": None,
            "department_code": None,
            "assigned_officer_id": None,
            "confidence": 0.35,
            "requires_admin_review": True,
            "reason": (
                "Location is outside configured Bengaluru demonstration pilot areas. "
                "Routed to Administrator Review to verify jurisdiction ownership."
            ),
        }

    mappings = (
        db.query(JurisdictionMapping)
        .filter(
            JurisdictionMapping.area_id == area.area_id,
            JurisdictionMapping.complaint_category == category,
            JurisdictionMapping.is_active == True,  # noqa: E712
        )
        .all()
    )

    if len(mappings) == 1:
        mapping = mappings[0]
        dept = db.query(Department).filter(Department.department_id == mapping.department_id, Department.is_active == True).first()  # noqa: E712
        if dept:
            # Find demonstration officer assigned to this department + area (or department fallback)
            officer = (
                db.query(Officer)
                .filter(Officer.department_id == dept.department_id, Officer.assigned_area_id == area.area_id)
                .first()
            )
            if not officer:
                officer = db.query(Officer).filter(Officer.department_id == dept.department_id).first()

            is_ambiguous = "ambiguous" in (mapping.ownership_type or "").lower() or "shared" in (mapping.ownership_type or "").lower()
            confidence = 0.62 if is_ambiguous else 0.89
            requires_review = is_ambiguous or (officer is None)

            return {
                "area_id": area.area_id,
                "area_name": area.area_name,
                "department_id": dept.department_id,
                "department_name": dept.department_name,
                "department_code": dept.department_code,
                "assigned_officer_id": None if requires_review else (officer.officer_id if officer else None),
                "confidence": confidence,
                "requires_admin_review": requires_review,
                "reason": (
                    f"Matched sample pilot jurisdiction '{mapping.ownership_type}' for {area.area_name}: "
                    f"{dept.department_name} ({dept.department_code}). "
                    f"{mapping.confidence_or_source_notes or ''}"
                ).strip(),
            }

    if len(mappings) > 1:
        primary = mappings[0]
        dept = db.query(Department).filter(Department.department_id == primary.department_id).first()
        return {
            "area_id": area.area_id,
            "area_name": area.area_name,
            "department_id": dept.department_id if dept else None,
            "department_name": dept.department_name if dept else None,
            "department_code": dept.department_code if dept else None,
            "assigned_officer_id": None,
            "confidence": 0.52,
            "requires_admin_review": True,
            "reason": (
                f"Multiple overlapping sample jurisdiction mappings ({len(mappings)}) exist in {area.area_name} "
                f"for '{category}'. Routed to Administrator Review to confirm ownership."
            ),
        }

    return {
        "area_id": area.area_id,
        "area_name": area.area_name,
        "department_id": None,
        "department_name": None,
        "department_code": None,
        "assigned_officer_id": None,
        "confidence": 0.30,
        "requires_admin_review": True,
        "reason": (
            f"No sample jurisdiction mapping configured for category '{category}' in {area.area_name}. "
            "Routed to Administrator Review."
        ),
    }
