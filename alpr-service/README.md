# ALPR Service (Plate + Face Recognition)

This service performs plate OCR, face recognition, and security decision scoring for toll gate captures.

## Endpoints

- `GET /health`
- `POST /recognize`

`POST /recognize` expects:

```json
{
  "captureId": 10,
  "imagePath": "https://example.com/uploads/gate/gate_123.jpg",
  "gateId": "gate-1",
  "capturedAt": "2026-04-04T10:00:00.000Z",
  "wantedPersons": [
    {
      "fullName": "John Doe",
      "faceImagePath": "https://example.com/uploads/wanted/john.jpg"
    }
  ],
  "stolenCars": [
    {
      "plateNumber": "ABC1234",
      "plateNormalized": "ABC1234"
    }
  ]
}
```

Returns:

```json
{
  "plateText": "ABC1234",
  "plateConfidence": 0.88,
  "faceName": "John Doe",
  "faceConfidence": 0.91,
  "securityDecision": "allow",
  "strategy": "easyocr",
  "reviewRequired": false,
  "candidates": []
}
```

## Local run

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Backend integration variables (backend .env)

```env
ALPR_ENABLED=true
ALPR_ENDPOINT=http://127.0.0.1:8000/recognize
ALPR_API_KEY=replace_with_internal_key
ALPR_MIN_CONFIDENCE=0.75
ALPR_PLATE_REGEX=^[A-Z0-9-]{4,12}$
```
