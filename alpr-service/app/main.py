import os
import re
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
    ("egy_new",     re.compile(r"^[A-Z]{3}\d{3}$")),        # ABG123  — 2022 standard private
    ("egy_old",     re.compile(r"^\d{1,3}[A-Z]{1,3}$")),    # 123AB   — classic private
    ("egy_mixed",   re.compile(r"^[A-Z]{1,2}\d{3,5}$")),    # A12345  — mixed variant
    ("egy_numeric", re.compile(r"^\d{4,9}$")),               # 12345   — trucks / old gov
    ("generic",     re.compile(r"^[A-Z0-9]{3,9}$")),        # catch-all
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
    """Return 8 pre-processed variants tuned for Egyptian plates from ESP32-CAM images."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 2× upscale — ESP32-CAM is low-res; cubic keeps character edges sharp
    upscaled = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

    # CLAHE — local contrast enhancement; critical for sun-faded / low-light plates
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    clahe_img = clahe.apply(upscaled)

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

    return [image, upscaled, clahe_img, denoised, thresh_adapt, thresh_otsu, sharpened, thresh_inv]


def run_ocr(image: np.ndarray) -> List[Tuple[str, float]]:
    out: List[Tuple[str, float]] = []

    for variant in build_variants(image):
        # ── Pass 1: per-region (paragraph=False) ──────────────────────────
        results = reader.readtext(variant, detail=1, paragraph=False)
        variant_frags: List[Tuple[str, float]] = []
        for _, text, confidence in results:
            raw_stripped = _EG_HEADER_RE.sub("", text).strip()
            if not raw_stripped:
                continue
            plate = normalize_plate(text)
            conf = float(confidence)
            if not plate or plate in _EG_HEADER_NORMALIZED:
                continue
            out.append((plate, conf))
            variant_frags.append((plate, conf))

        # ── Combine fragments from this variant ───────────────────────────
        # Egyptian plates often appear as two separate OCR regions:
        # one for letters (طرد) and one for digits (٨١٢٦).
        # Concatenating them produces the full plate candidate (e.g. TRD8126).
        if len(variant_frags) >= 2:
            # Try all ordered concatenations (letters+digits and digits+letters)
            frags_text = [p for p, _ in variant_frags]
            avg_conf = sum(c for _, c in variant_frags) / len(variant_frags)
            combined_fwd = re.sub(r"[^A-Z0-9]", "", "".join(frags_text).upper())
            combined_rev = re.sub(r"[^A-Z0-9]", "", "".join(reversed(frags_text)).upper())
            for combined in (combined_fwd, combined_rev):
                if combined and combined not in _EG_HEADER_NORMALIZED and 3 <= len(combined) <= 9:
                    out.append((combined, avg_conf))

        # ── Pass 2: paragraph=True — EasyOCR merges regions itself ────────
        try:
            para_results = reader.readtext(variant, detail=1, paragraph=True)
            for _, text, confidence in para_results:
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

    return out


def pick_best(
    candidates: List[Tuple[str, float]],
) -> Tuple[Optional[str], Optional[float], bool, List[Dict[str, Any]], str, Optional[str]]:
    """Select the best OCR candidate with Egyptian-format-aware confidence thresholds."""
    ranked: Dict[str, float] = {}
    for plate, conf in candidates:
        if plate not in ranked or conf > ranked[plate]:
            ranked[plate] = conf

    # Prefer plates that match a known Egyptian format when confidence is equal
    sorted_items = sorted(
        ranked.items(),
        key=lambda x: (x[1], 0 if classify_eg_plate(x[0]) == "unknown" else 1),
        reverse=True,
    )
    response_candidates = [
        {"plateText": p, "confidence": round(c, 4), "formatType": classify_eg_plate(p)}
        for p, c in sorted_items[:10]
    ]

    if not sorted_items:
        return None, None, True, response_candidates, "unknown", None

    best_plate, best_conf = sorted_items[0]
    fmt = classify_eg_plate(best_plate)
    valid_pattern = fmt != "unknown"

    # Relax the confidence threshold for plates that exactly match a known Egyptian format.
    # A correctly-formatted plate at 62% is far more trustworthy than a random string at 76%.
    effective_min = ALPR_MIN_CONFIDENCE
    if fmt == "egy_new" or fmt == "egy_old":
        effective_min = max(0.50, ALPR_MIN_CONFIDENCE - 0.15)   # −15 pp bonus
    elif fmt == "egy_mixed":
        effective_min = max(0.55, ALPR_MIN_CONFIDENCE - 0.10)   # −10 pp bonus
    elif fmt == "egy_numeric":
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
