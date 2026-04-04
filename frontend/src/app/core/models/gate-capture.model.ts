export interface GateCapture {
  id: number;
  gateId: string;
  eventType: 'access_granted' | 'access_denied' | 'manual_capture';
  cardUid: string | null;
  imagePath: string;
  plateText?: string | null;
  plateConfidence?: number | null;
  ocrStatus?: 'pending' | 'processing' | 'done' | 'review_required' | 'failed';
  ocrProcessedAt?: string | null;
  ocrError?: string | null;
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
