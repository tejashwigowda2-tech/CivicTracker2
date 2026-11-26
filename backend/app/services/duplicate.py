import math
import re
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Complaint

ACTIVE_DUPLICATE_STATUSES = {
    "SUBMITTED",
    "UNDER_REVIEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "AWAITING_VERIFICATION",
    "DISPUTED",
    "OVERDUE",
    "REOPENED",
}


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_m = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_m * c


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    stopwords = {"the", "a", "an", "is", "are", "on", "in", "at", "near", "and", "of", "to", "for", "with"}
    return {w for w in words if len(w) > 2 and w not in stopwords}


def description_similarity(text_a: str, text_b: str) -> float:
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = len(tokens_a & tokens_b)
    union = len(tokens_a | tokens_b)
    return round(intersection / union, 2) if union else 0.0


def find_nearby_duplicates(
    db: Session,
    latitude: float,
    longitude: float,
    category: str,
    description: str = "",
    radius_meters: float | None = None,
) -> List[Dict[str, Any]]:
    radius = radius_meters or settings.DUPLICATE_RADIUS_METERS
    candidates = (
        db.query(Complaint)
        .filter(
            Complaint.category == category,
            Complaint.status.in_(ACTIVE_DUPLICATE_STATUSES),
        )
        .all()
    )

    matches: List[Dict[str, Any]] = []
    for c in candidates:
        dist = haversine_meters(latitude, longitude, c.latitude, c.longitude)
        if dist <= radius:
            text_sim = description_similarity(description, c.description or "")
            # Composite match score: 70% proximity, 30% text similarity (or 100% proximity if description empty)
            prox_score = max(0.0, 1.0 - (dist / radius))
            match_score = round((0.75 * prox_score + 0.25 * text_sim) if description else prox_score, 2)
            first_image = next((img.image_url for img in c.images if img.image_type == "BEFORE"), None)
            matches.append(
                {
                    "complaint_id": c.complaint_id,
                    "reference_code": c.reference_code,
                    "category": c.category,
                    "description": c.description,
                    "address_hint": c.address_hint,
                    "status": c.status,
                    "priority_level": c.priority_level,
                    "distance_meters": round(dist, 1),
                    "text_similarity": text_sim,
                    "match_score": match_score,
                    "support_count": len(c.supports),
                    "thumbnail_url": first_image,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                }
            )

    matches.sort(key=lambda m: (m["distance_meters"], -m["match_score"]))
    return matches[:5]
