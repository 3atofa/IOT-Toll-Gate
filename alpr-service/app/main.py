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


class RecognizeResponse(BaseModel):
    plateText: Optional[str] = None
    confidence: Optional[float] = None
    strategy: str = "easyocr"
    reviewRequired: bool = True
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

    return RecognizeResponse(
        plateText=plate_text,
        confidence=confidence,
        reviewRequired=review_required,
        candidates=response_candidates,
    )
