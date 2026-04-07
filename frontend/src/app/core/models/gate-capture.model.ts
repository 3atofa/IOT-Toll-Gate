export interface GateCapture {
  id: number;
  gateId: string;
  eventType: 'access_granted' | 'access_denied' | 'manual_capture' | 'security_check';
  cardUid: string | null;
  imagePath: string;
  plateText?: string | null;
  plateConfidence?: number | null;
  faceName?: string | null;
  faceConfidence?: number | null;
  faceStatus?: 'pending' | 'processing' | 'done' | 'review_required' | 'failed';
  faceError?: string | null;
  ocrStatus?: 'pending' | 'processing' | 'done' | 'review_required' | 'failed';
  ocrProcessedAt?: string | null;
  ocrError?: string | null;
  securityDecision?: 'allow' | 'block' | 'review';
  securityReason?: string | null;
  capturedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaptureListResponse {
  total: number;
  limit: number;
  offset: number;
  items: GateCapture[];
}
