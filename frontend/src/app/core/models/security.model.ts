export interface StolenCar {
  id: number;
  plateNumber: string;
  plateNormalized: string;
  vehicleType?: string | null;
  status: 'active' | 'inactive';
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SecurityAlert {
  id: number;
  captureId: number;
  alertType: 'wanted_person' | 'stolen_car' | 'plate_review' | 'face_review';
  decision: 'allow' | 'block' | 'review';
  reason: string;
  relatedName?: string | null;
  relatedPlate?: string | null;
  metadata?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
