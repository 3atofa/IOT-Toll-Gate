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
ALPR_PLATE_REGEX = os.getenv("ALPR_PLATE_REGEX", r"^[A-Z0-9-]{4,12}$")
ALPR_BASE_URL = os.getenv("ALPR_BASE_URL", "")

try:
    PLATE_RE = re.compile(ALPR_PLATE_REGEX)
except re.error as exc:
    raise RuntimeError(f"Invalid ALPR_PLATE_REGEX: {exc}") from exc

reader = easyocr.Reader(["en"], gpu=False)


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
    return re.sub(r"\s+", "", (text or "").upper())


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
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    upscaled = cv2.resize(gray, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
    denoised = cv2.bilateralFilter(upscaled, 9, 75, 75)
    thresh = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2,
    )

    return [image, gray, upscaled, denoised, thresh]


def run_ocr(image: np.ndarray) -> List[Tuple[str, float]]:
    out: List[Tuple[str, float]] = []

    for variant in build_variants(image):
        results = reader.readtext(variant, detail=1, paragraph=False)
        for _, text, confidence in results:
            plate = normalize_plate(text)
            conf = float(confidence)
            if plate:
                out.append((plate, conf))

    return out


def pick_best(candidates: List[Tuple[str, float]]) -> Tuple[Optional[str], Optional[float], bool, List[Dict[str, Any]]]:
    ranked: Dict[str, float] = {}
    for plate, conf in candidates:
        if plate not in ranked or conf > ranked[plate]:
            ranked[plate] = conf

    sorted_items = sorted(ranked.items(), key=lambda x: x[1], reverse=True)
    response_candidates = [{"plateText": p, "confidence": round(c, 4)} for p, c in sorted_items[:10]]

    if not sorted_items:
        return None, None, True, response_candidates

    best_plate, best_conf = sorted_items[0]
    valid_pattern = bool(PLATE_RE.match(best_plate))
    review_required = (best_conf < ALPR_MIN_CONFIDENCE) or (not valid_pattern)

    return best_plate, round(best_conf, 4), review_required, response_candidates


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
    plate_text, confidence, review_required, response_candidates = pick_best(candidates)
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
