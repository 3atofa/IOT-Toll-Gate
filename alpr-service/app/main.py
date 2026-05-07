import os
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

import cv2
import easyocr
import numpy as np
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

ALPR_API_KEY = os.getenv("ALPR_API_KEY", "")
ALPR_REQUEST_TIMEOUT = float(os.getenv("ALPR_REQUEST_TIMEOUT", "8"))
ALPR_MIN_CONFIDENCE = float(os.getenv("ALPR_MIN_CONFIDENCE", "0.75"))
ALPR_FACE_MIN_CONFIDENCE = float(os.getenv("ALPR_FACE_MIN_CONFIDENCE", "0.55"))
ALPR_PLATE_REGEX = os.getenv("ALPR_PLATE_REGEX", r"^[A-Z0-9]{3,9}$")
ALPR_BASE_URL = os.getenv("ALPR_BASE_URL", "")

try:
    PLATE_RE = re.compile(ALPR_PLATE_REGEX)
except re.error as exc:
    raise RuntimeError(f"Invalid ALPR_PLATE_REGEX: {exc}") from exc

# ── Egyptian plate support ─────────────────────────────────────────────────
# Eastern Arabic / Indic digits (٠١٢٣٤٥٦٧٨٩) → ASCII digits
_ARABIC_NUMERALS = str.maketrans("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669",
                                  "0123456789")

# Arabic letter → closest Latin used on Egyptian plates
_ARABIC_TO_LATIN: Dict[str, str] = {
    "\u0623": "A", "\u0627": "A", "\u0625": "A", "\u0622": "A", "\u0621": "A",  # أ ا إ آ ء
    "\u0628": "B",                                                               # ب
    "\u062a": "T", "\u062b": "T",                                               # ت ث
    "\u062c": "G",                                                               # ج
    "\u062d": "H", "\u062e": "K",                                               # ح خ
    "\u062f": "D", "\u0630": "D",                                               # د ذ
    "\u0631": "R",                                                               # ر
    "\u0632": "Z",                                                               # ز
    "\u0633": "S", "\u0634": "S", "\u0635": "S", "\u0636": "D",               # س ش ص ض
    "\u0637": "T", "\u0638": "Z",                                               # ط ظ
    "\u0639": "A", "\u063a": "G",                                               # ع غ
    "\u0641": "F",                                                               # ف
    "\u0642": "Q",                                                               # ق
    "\u0643": "K",                                                               # ك
    "\u0644": "L",                                                               # ل
    "\u0645": "M",                                                               # م
    "\u0646": "N",                                                               # ن
    "\u0647": "H",                                                               # ه
    "\u0648": "W",                                                               # و
    "\u064a": "Y", "\u0649": "Y",                                               # ي ى
    "\u0629": "H",                                                               # ة
}

# Egyptian plate format patterns — checked in order, first match wins
_EG_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("egy_new",      re.compile(r"^[A-Z]{3}\d{3}$")),        # ABG123   — 2022 standard (3L+3N)
    ("egy_old",      re.compile(r"^\d{1,3}[A-Z]{1,3}$")),    # 123AB    — classic (1-3N + letters)
    ("egy_old_ext",  re.compile(r"^\d{4,5}[A-Z]{1,3}$")),    # 8126TRD  — extended old (4-5N + letters)
    ("egy_mixed",    re.compile(r"^[A-Z]{1,3}\d{3,6}$")),    # TRD8126  — letter-first (1-3L + 3-6N)
    ("egy_numeric",  re.compile(r"^\d{4,9}$")),               # 12345    — trucks / old gov
    ("generic",      re.compile(r"^[A-Z0-9]{3,9}$")),        # catch-all
]

# ── Egyptian plate header strip ───────────────────────────────────────────
# Egyptian plates print "مصر" (Egypt in Arabic) or "EGYPT" at the top/side.
# EasyOCR often reads this text as part of the plate result. We must remove
# it before processing — otherwise مصر → MSR, or مصرABG123 → MSRABG123.
_EG_HEADER_RE = re.compile(
    r"(\u0645\s*\u0635\s*\u0631"   # مصر  (with optional spaces between letters)
    r"|EGYPT"                        # English variant
    r"|egypt)"                       # lowercase variant
    r"\s*[|\-_.,;:]*\s*",           # optional separator after header
    re.IGNORECASE | re.UNICODE,
)

# Standalone header tokens that after normalization would become junk
_EG_HEADER_NORMALIZED = {"MSR", "EGYPT"}  # exact matches to discard entirely

reader = easyocr.Reader(["en", "ar"], gpu=False)  # "ar" enables Arabic script OCR for Egyptian plate letters


class RecognizeRequest(BaseModel):
    captureId: int
    imagePath: str
    gateId: Optional[str] = None
    capturedAt: Optional[str] = None
    wantedPersons: List[Dict[str, Any]] = Field(default_factory=list)
    stolenCars: List[Dict[str, Any]] = Field(default_factory=list)


class RecognizeResponse(BaseModel):
    plateText: Optional[str] = None
    plateConfidence: Optional[float] = None
    plateFormatted: Optional[str] = None
    plateFormatType: str = "unknown"
    faceName: Optional[str] = None
    faceConfidence: Optional[float] = None
    faceDetected: bool = False
    faceReviewRequired: bool = True
    strategy: str = "easyocr"
    reviewRequired: bool = True
    securityDecision: str = "review"
    securityReason: Optional[str] = None
    wantedPersonMatch: Optional[str] = None
    stolenCarMatch: Optional[str] = None
    candidates: List[Dict[str, Any]] = Field(default_factory=list)


app = FastAPI(title="Toll Gate ALPR Service", version="1.0.0")


def normalize_plate(text: str) -> str:
    """Strip noise and transliterate Arabic so every plate becomes plain A-Z0-9."""
    if not text:
        return ""
    # 0. Remove Egyptian plate header "مصر" / "EGYPT" before any transliteration.
    #    This handles cases where OCR reads the whole plate as one region:
    #    "مصر ABG123" → "ABG123",  "EGYPT 123AB" → "123AB"
    text = _EG_HEADER_RE.sub("", text).strip()
    if not text:
        return ""
    # 1. Convert Eastern Arabic / Indic digits → ASCII
    text = text.translate(_ARABIC_NUMERALS)
    # 2. Transliterate Arabic letters → Latin equivalents
    for ar, lat in _ARABIC_TO_LATIN.items():
        text = text.replace(ar, lat)
    # 3. Drop everything except letters, digits, dash — then uppercase
    return re.sub(r"[^A-Za-z0-9\-]", "", text).upper()


def classify_eg_plate(plate: str) -> str:
    """Return the Egyptian plate format label for a normalised plate string."""
    for name, pat in _EG_PATTERNS:
        if pat.match(plate):
            return name
    return "unknown"


def format_eg_plate(plate: str, fmt: str) -> str:
    """Return a human-readable spaced plate string for UI display."""
    if fmt == "egy_new" and len(plate) == 6:          # ABG123 → ABG 123
        return f"{plate[:3]} {plate[3:]}"
    m = re.match(r"^(\d+)([A-Z]+)$", plate)           # 123AB  → 123 AB
    if m:
        return f"{m.group(1)} {m.group(2)}"
    m = re.match(r"^([A-Z]+)(\d+)$", plate)           # A12345 → A 12345
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return plate


def to_absolute_image_url(image_path: str) -> str:
    if image_path.startswith("http://") or image_path.startswith("https://"):
        return image_path

    if not ALPR_BASE_URL:
        raise HTTPException(status_code=400, detail="ALPR_BASE_URL required for relative imagePath")

    return ALPR_BASE_URL.rstrip("/") + "/" + image_path.lstrip("/")


def fetch_image(url: str) -> np.ndarray:
    try:
        response = requests.get(url, timeout=ALPR_REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {exc}") from exc

    image_array = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Downloaded content is not a valid image")

    return image


def build_variants(image: np.ndarray) -> List[np.ndarray]:
    """Return 10 pre-processed variants tuned for Egyptian plates from ESP32-CAM images."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 2× upscale — ESP32-CAM is low-res; cubic keeps character edges sharp
    up2x = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

    # 3× upscale with Lanczos — for small / distant plates
    up3x = cv2.resize(gray, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_LANCZOS4)

    # CLAHE on 2× — local contrast enhancement; critical for sun-faded / low-light plates
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    clahe_img = clahe.apply(up2x)

    # Bilateral denoise — smooths noise while preserving character edges
    denoised = cv2.bilateralFilter(clahe_img, 9, 75, 75)

    # Adaptive threshold — handles uneven plate lighting
    thresh_adapt = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2,
    )

    # Otsu global threshold — best for clean high-contrast Egyptian white plates
    _, thresh_otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Sharpening kernel — recovers detail lost in gate-camera blur
    kernel_sharpen = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    sharpened = cv2.filter2D(clahe_img, -1, kernel_sharpen)

    # Inverted adaptive — for dark-background plates (older Egyptian formats)
    thresh_inv = cv2.bitwise_not(thresh_adapt)

    # CLAHE on 3× — extra detail for very small or distant plates
    clahe_3x = clahe.apply(up3x)

    # Morphological dilation on Otsu — thickens broken/thin Arabic strokes
    kern_dil = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    dilated = cv2.dilate(thresh_otsu, kern_dil, iterations=1)

    return [image, up2x, clahe_img, denoised, thresh_adapt, thresh_otsu, sharpened, thresh_inv, clahe_3x, dilated]


def crop_plate_region(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Detect and crop the license plate region using contour analysis.
    Egyptian plates are white with a blue left strip; aspect ratio ~2:1 to 6:1.
    Returns the cropped region, or None if no plate-like rectangle is found.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 200)
    # Close small gaps between plate border lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = image.shape[:2]
    img_area = h * w
    best: Optional[Tuple[int, int, int, int]] = None
    best_area = 0.0

    for cnt in contours:
        rx, ry, rw, rh = cv2.boundingRect(cnt)
        area = rw * rh
        aspect = rw / max(rh, 1)
        # Plate-like: aspect 1.8–7.0, area 2%–65% of image
        if not (1.8 <= aspect <= 7.0 and 0.02 * img_area <= area <= 0.65 * img_area):
            continue
        if area > best_area:
            best_area = area
            best = (rx, ry, rw, rh)

    if best is None:
        return None

    rx, ry, rw, rh = best
    pad = 12
    rx = max(0, rx - pad);          ry = max(0, ry - pad)
    rw = min(w - rx, rw + 2 * pad); rh = min(h - ry, rh + 2 * pad)
    crop = image[ry:ry + rh, rx:rx + rw]
    return crop if crop.size > 0 else None


def build_plate_crop_variants(crop: np.ndarray) -> List[np.ndarray]:
    """4 focused variants run on the isolated plate crop for higher-resolution OCR."""
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop.copy()
    up2x = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    clahe_img = clahe.apply(up2x)
    _, thresh_otsu = cv2.threshold(clahe_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel_sharpen = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    sharpened = cv2.filter2D(clahe_img, -1, kernel_sharpen)
    return [up2x, clahe_img, thresh_otsu, sharpened]


def run_ocr(image: np.ndarray) -> List[Tuple[str, float]]:
    out: List[Tuple[str, float]] = []

    # Full-image variants + focused plate-crop variants (if a plate region is detected)
    all_variant_sets: List[List[np.ndarray]] = [build_variants(image)]
    plate_crop = crop_plate_region(image)
    if plate_crop is not None:
        all_variant_sets.append(build_plate_crop_variants(plate_crop))

    # EasyOCR params tuned for ESP32-CAM low-res images and Arabic plate text
    # Lower text_threshold/low_text/link_threshold to catch faded/blurry Arabic chars
    ocr_kw = dict(
        detail=1,
        paragraph=False,
        text_threshold=0.5,   # default 0.7 — lower catches faded / blurry Arabic
        low_text=0.3,         # default 0.4 — catch smaller character regions
        link_threshold=0.3,   # default 0.4 — less aggressive char linking (better for Arabic)
        min_size=10,          # default 20 — detect small chars on low-res plates
    )
    ocr_kw_para = {**ocr_kw, "paragraph": True}

    def _ocr_variant(variant: np.ndarray, do_para: bool) -> None:
        # ── Pass 1: per-region OCR ──────────────────────────────────────
        try:
            raw = reader.readtext(variant, **ocr_kw)
        except Exception:
            return

        # Sort by leftmost x-coordinate of bbox (left→right image order).
        # Egyptian plates: digits are on the LEFT, Arabic letters on the RIGHT.
        # Sorted left→right gives digits-first → combined = "8126TRD" (egy_old_ext).
        # Reversed gives letters-first  → combined = "TRD8126" (egy_mixed).
        # Both orders are tried so pick_best can choose the best-matching format.
        raw.sort(key=lambda r: min(pt[0] for pt in r[0]))

        variant_frags: List[Tuple[str, float]] = []
        for bbox, text, confidence in raw:
            raw_stripped = _EG_HEADER_RE.sub("", text).strip()
            if not raw_stripped:
                continue
            plate = normalize_plate(text)
            conf = float(confidence)
            if not plate or plate in _EG_HEADER_NORMALIZED:
                continue
            out.append((plate, conf))
            variant_frags.append((plate, conf))

        # ── Combine adjacent fragments (left→right AND right→left) ───────
        if len(variant_frags) >= 2:
            frags = [p for p, _ in variant_frags]
            avg_conf = sum(c for _, c in variant_frags) / len(variant_frags)
            for order in (frags, list(reversed(frags))):
                combined = re.sub(r"[^A-Z0-9]", "", "".join(order).upper())
                if combined and combined not in _EG_HEADER_NORMALIZED and 3 <= len(combined) <= 10:
                    out.append((combined, avg_conf))

        # ── Pass 2: paragraph=True (EasyOCR merges nearby text regions) ──
        # Only run on first 3 variants per set — paragraph inference is expensive.
        if do_para:
            try:
                para = reader.readtext(variant, **ocr_kw_para)
                for _, text, confidence in para:
                    raw_stripped = _EG_HEADER_RE.sub("", text).strip()
                    if not raw_stripped:
                        continue
                    plate = normalize_plate(text)
                    conf = float(confidence)
                    if not plate or plate in _EG_HEADER_NORMALIZED:
                        continue
                    out.append((plate, conf))
            except Exception:
                pass

    for variant_set in all_variant_sets:
        for i, variant in enumerate(variant_set):
            _ocr_variant(variant, do_para=(i < 3))

    return out


def pick_best(
    candidates: List[Tuple[str, float]],
) -> Tuple[Optional[str], Optional[float], bool, List[Dict[str, Any]], str, Optional[str]]:
    """Select the best OCR candidate using format priority + vote frequency + confidence."""
    if not candidates:
        return None, None, True, [], "unknown", None

    # Count appearances across all variants/passes — high vote count = reliable reading
    vote_counts: Counter = Counter(plate for plate, _ in candidates)

    # Keep highest confidence per unique plate
    best_conf_per: Dict[str, float] = {}
    for plate, conf in candidates:
        if plate not in best_conf_per or conf > best_conf_per[plate]:
            best_conf_per[plate] = conf

    # Format priority: known Egyptian formats strongly outrank generic/unknown strings.
    # This ensures "8126TRD" (egy_old_ext, 0.65 conf) beats "8126" (generic, 0.99 conf).
    _FMT_PRIORITY: Dict[str, float] = {
        "egy_new": 3.0, "egy_old": 2.8, "egy_old_ext": 2.8,
        "egy_mixed": 2.5, "egy_numeric": 2.0, "generic": 1.0, "unknown": 0.0,
    }

    def _score(plate: str) -> float:
        fmt_p = _FMT_PRIORITY.get(classify_eg_plate(plate), 0.0)
        # +0.04 per extra vote (beyond first), capped at +0.20 for 6+ votes
        vote_bonus = min(vote_counts[plate] - 1, 5) * 0.04
        return fmt_p + vote_bonus + best_conf_per[plate]

    sorted_items = sorted(best_conf_per.items(), key=lambda x: _score(x[0]), reverse=True)

    response_candidates = [
        {
            "plateText": p,
            "confidence": round(c, 4),
            "formatType": classify_eg_plate(p),
            "votes": vote_counts[p],
        }
        for p, c in sorted_items[:10]
    ]

    best_plate, best_conf = sorted_items[0]
    fmt = classify_eg_plate(best_plate)
    valid_pattern = fmt != "unknown"

    # Relax confidence threshold for known Egyptian formats
    effective_min = ALPR_MIN_CONFIDENCE
    if fmt in ("egy_new", "egy_old", "egy_old_ext"):
        effective_min = max(0.50, ALPR_MIN_CONFIDENCE - 0.15)   # −15 pp bonus
    elif fmt in ("egy_mixed", "egy_numeric"):
        effective_min = max(0.55, ALPR_MIN_CONFIDENCE - 0.10)   # −10 pp bonus

    review_required = (best_conf < effective_min) or (not valid_pattern)
    plate_formatted = format_eg_plate(best_plate, fmt)

    return best_plate, round(best_conf, 4), review_required, response_candidates, fmt, plate_formatted


def get_face_cascade() -> cv2.CascadeClassifier:
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    if cascade.empty():
        raise RuntimeError("Failed to load Haar cascade for face detection")
    return cascade


def detect_largest_face(image: np.ndarray) -> Optional[np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = get_face_cascade()
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None

    x, y, w, h = sorted(faces, key=lambda rect: rect[2] * rect[3], reverse=True)[0]
    crop = gray[y:y + h, x:x + w]
    if crop.size == 0:
        return None
    crop = cv2.resize(crop, (200, 200))
    return crop


def load_face_sample(image_url: str) -> Optional[np.ndarray]:
    image = fetch_image(to_absolute_image_url(image_url))
    return detect_largest_face(image)


def build_face_model(wanted_persons: List[Dict[str, Any]]):
    if not wanted_persons or not hasattr(cv2, "face"):
        return None, {}, {}

    samples: List[np.ndarray] = []
    labels: List[int] = []
    label_to_person: Dict[int, Dict[str, Any]] = {}
    person_lookup: Dict[str, Dict[str, Any]] = {}

    label_id = 0
    for person in wanted_persons:
        image_path = person.get("faceImagePath")
        if not image_path:
            continue

        try:
            face_sample = load_face_sample(image_path)
        except Exception:
            face_sample = None

        if face_sample is None:
            continue

        samples.append(face_sample)
        labels.append(label_id)
        label_to_person[label_id] = person
        person_lookup[str(label_id)] = person
        label_id += 1

    if not samples:
        return None, label_to_person, person_lookup

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(samples, np.array(labels))
    return recognizer, label_to_person, person_lookup


def recognize_face(image: np.ndarray, wanted_persons: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[float], bool, Optional[str], bool]:
    if not wanted_persons or not hasattr(cv2, "face"):
        return None, None, True, None, False

    live_face = detect_largest_face(image)
    if live_face is None:
        return None, None, True, None, False

    recognizer, label_to_person, _ = build_face_model(wanted_persons)
    if recognizer is None:
        return None, None, True, None, True

    label, distance = recognizer.predict(live_face)
    person = label_to_person.get(int(label))
    if not person:
        return None, None, True, None, True

    normalized_confidence = max(0.0, min(1.0, 1.0 - (float(distance) / 120.0)))
    face_label = person.get("faceLabel") or person.get("fullName")
    review_required = normalized_confidence < ALPR_FACE_MIN_CONFIDENCE
    return face_label, round(normalized_confidence, 4), review_required, None, True


def match_stolen_car(plate_text: Optional[str], stolen_cars: List[Dict[str, Any]]) -> Optional[str]:
    normalized = normalize_plate(plate_text or "")
    if not normalized:
        return None

    for car in stolen_cars:
        car_plate = normalize_plate(car.get("plateNormalized") or car.get("plateNumber") or "")
        if car_plate and car_plate == normalized:
            return car.get("plateNumber") or normalized

    return None


def decide_security(plate_text: Optional[str], face_name: Optional[str], stolen_match: Optional[str], wanted_match: Optional[str], plate_review: bool, face_review: bool) -> Tuple[str, Optional[str]]:
    if stolen_match:
        return "block", f"Stolen car matched: {stolen_match}"

    if wanted_match:
        return "block", f"Wanted person matched: {wanted_match}"

    if plate_review or face_review:
        return "review", "Recognition requires manual review"

    return "allow", None


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "alpr-service"}


@app.post("/recognize", response_model=RecognizeResponse)
def recognize(
    payload: RecognizeRequest,
    x_alpr_key: Optional[str] = Header(default=None),
) -> RecognizeResponse:
    if ALPR_API_KEY and x_alpr_key != ALPR_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid ALPR key")

    image_url = to_absolute_image_url(payload.imagePath)
    image = fetch_image(image_url)

    candidates = run_ocr(image)
    plate_text, confidence, review_required, response_candidates, plate_format_type, plate_formatted = pick_best(candidates)
    face_name, face_confidence, face_review_required, face_error, face_detected = recognize_face(image, payload.wantedPersons)
    # Always attempt watchlist plate matching even if OCR is marked for review.
    # This allows exact wanted/stolen plate hits (e.g., short formats like BT2)
    # to trigger blocking alerts immediately.
    stolen_match = match_stolen_car(plate_text, payload.stolenCars)
    # A recognized wanted person should block immediately even if confidence is low.
    # The review flag is still returned separately for UI/ops visibility.
    wanted_match = face_name if face_name else None
    security_decision, security_reason = decide_security(
        plate_text,
        face_name,
        stolen_match,
        wanted_match,
        review_required,
        face_review_required,
    )

    return RecognizeResponse(
        plateText=plate_text,
        plateConfidence=confidence,
        plateFormatted=plate_formatted,
        plateFormatType=plate_format_type or "unknown",
        faceName=face_name,
        faceConfidence=face_confidence,
        faceDetected=face_detected,
        faceReviewRequired=face_review_required,
        reviewRequired=review_required,
        securityDecision=security_decision,
        securityReason=security_reason,
        wantedPersonMatch=wanted_match,
        stolenCarMatch=stolen_match,
        candidates=response_candidates,
    )
