import base64
import io
import json
from typing import Any, Dict, Optional

import httpx
from PIL import Image, ImageStat

from ..config import settings

CATEGORY_KEYWORDS = {
    "potholes_road_damage": [
        "pothole", "road", "asphalt", "crater", "crack", "pavement", "tar", "bump",
        "carriageway", "sinkhole", "lane", "bitumen", "damaged road", "broken road",
    ],
    "garbage_accumulation": [
        "garbage", "trash", "waste", "dump", "litter", "rubbish", "bin", "plastic",
        "debris", "stink", "foul", "pile", "uncollected", "sweeping",
    ],
    "drainage_blockage": [
        "drain", "drainage", "sewer", "sewage", "clog", "blocked", "overflow",
        "waterlogging", "flood", "manhole", "stormwater", "stagnant", "gutter",
    ],
}

SEVERITY_HIGH_KEYWORDS = [
    "deep", "accident", "dangerous", "urgent", "severe", "flood", "overflow",
    "collapsed", "injury", "huge", "large", "open manhole", "blocked completely",
]


def _analyze_image_heuristics(image_bytes: Optional[bytes]) -> Dict[str, Any]:
    """Compute transparent visual signal heuristics (brightness, saturation, contrast) via Pillow."""
    if not image_bytes:
        return {"has_image": False}
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img.thumbnail((160, 160))
        stat = ImageStat.Stat(img)
        r_mean, g_mean, b_mean = stat.mean
        brightness = (r_mean + g_mean + b_mean) / 3.0
        contrast = sum(stat.stddev) / 3.0
        hsv = img.convert("HSV")
        hsv_stat = ImageStat.Stat(hsv)
        saturation = hsv_stat.mean[1]

        # Heuristic visual score: asphalt roads are lower saturation & medium-dark;
        # stagnant water/drainage tends toward darker blue/green; garbage tends toward higher color variance/saturation.
        scores = {
            "potholes_road_damage": 0.35,
            "garbage_accumulation": 0.32,
            "drainage_blockage": 0.33,
        }
        if saturation < 55 and brightness < 145:
            scores["potholes_road_damage"] += 0.25
        if saturation > 70 or contrast > 55:
            scores["garbage_accumulation"] += 0.22
        if b_mean >= r_mean and brightness < 130:
            scores["drainage_blockage"] += 0.22

        return {
            "has_image": True,
            "brightness": round(brightness, 1),
            "saturation": round(saturation, 1),
            "contrast": round(contrast, 1),
            "visual_scores": scores,
        }
    except Exception:
        return {"has_image": False}


def _try_gemini_vision(image_bytes: bytes, description: str) -> Optional[Dict[str, Any]]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        prompt = (
            "Classify this civic infrastructure complaint image into exactly one of: "
            "'potholes_road_damage', 'garbage_accumulation', or 'drainage_blockage'. "
            f"Citizen description context: '{description}'. "
            "Respond strictly as JSON with keys: category, severity (Low|Medium|High|Critical), "
            "confidence (0.0-1.0), reasoning."
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                ]
            }]
        }
        resp = httpx.post(url, json=payload, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(text[start:end])
                return {
                    "suggested_category": parsed.get("category", "potholes_road_damage"),
                    "severity_hint": parsed.get("severity", "Medium"),
                    "confidence": float(parsed.get("confidence", 0.85)),
                    "mode": "vision_api_gemini",
                    "reasoning": parsed.get("reasoning", "Classified via configured Gemini Vision API."),
                    "is_simulated_fallback": False,
                }
    except Exception:
        return None
    return None


def classify_complaint(
    description: str = "",
    filename: str = "",
    image_bytes: Optional[bytes] = None,
) -> Dict[str, Any]:
    """
    AI-assisted classification with transparent fallback.
    Uses external Vision API only when explicitly configured and reachable.
    Otherwise runs deterministic rule-based + Pillow visual feature heuristics and clearly
    labels the result as rule-based/heuristic fallback (never claiming ML inference).
    """
    if image_bytes and settings.VISION_AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        api_result = _try_gemini_vision(image_bytes, description)
        if api_result:
            return api_result

    text_blob = f"{description or ''} {filename or ''}".lower()
    scores = {
        "potholes_road_damage": 0.15,
        "garbage_accumulation": 0.15,
        "drainage_blockage": 0.15,
    }
    matched_terms: Dict[str, list[str]] = {k: [] for k in scores}

    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_blob:
                scores[cat] += 0.25
                matched_terms[cat].append(kw)

    visual_info = _analyze_image_heuristics(image_bytes)
    if visual_info.get("has_image"):
        v_scores = visual_info["visual_scores"]
        for cat in scores:
            scores[cat] += v_scores.get(cat, 0.0) * 0.45

    best_cat = max(scores, key=lambda k: scores[k])
    total_score = sum(scores.values()) or 1.0
    raw_conf = scores[best_cat] / total_score
    # Scale confidence honestly for rule-based fallback
    confidence = round(min(0.88, max(0.38, raw_conf + (0.12 if matched_terms[best_cat] else 0.0))), 2)

    severity_hint = "Medium"
    if any(kw in text_blob for kw in SEVERITY_HIGH_KEYWORDS):
        severity_hint = "High"
    elif best_cat == "drainage_blockage" and ("overflow" in text_blob or "manhole" in text_blob):
        severity_hint = "Critical"

    if matched_terms[best_cat]:
        reason = (
            f"Rule-based fallback suggestion: matched context terms ({', '.join(matched_terms[best_cat][:4])})"
            + (" combined with basic image brightness/color statistics." if visual_info.get("has_image") else ".")
        )
    elif visual_info.get("has_image"):
        reason = (
            "Rule-based fallback suggestion using basic image color/contrast heuristics "
            "(no external ML vision model configured). Please confirm or change the category manually."
        )
    else:
        reason = "Default fallback suggestion (no external vision model configured and minimal context provided). Please select the category."

    return {
        "suggested_category": best_cat,
        "severity_hint": severity_hint,
        "confidence": confidence,
        "mode": "heuristic_fallback",
        "reasoning": reason,
        "is_simulated_fallback": True,
        "visual_telemetry": visual_info if visual_info.get("has_image") else None,
    }
