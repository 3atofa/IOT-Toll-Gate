export interface GateCapture {
  id: number;
  gateId: string;
  eventType: 'access_granted' | 'access_denied' | 'manual_capture';
  cardUid: string | null;
  imagePath: string;
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
