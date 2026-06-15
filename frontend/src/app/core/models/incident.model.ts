export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus   = 'open' | 'in_progress' | 'resolved';
export type TaskStatus       = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface AssignedTechnician {
  id: string;
  fullName: string;
  specialization: string;
  phone?: string;
}

export interface TechnicianTask {
  id: string;
  incidentId: string;
  technicianId: string;
  status: TaskStatus;
  assignedAt: string;
  completedAt?: string | null;
  notes?: string;
  technician?: AssignedTechnician;
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  gateId: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: string;
  resolvedAt?: string | null;
  resolutionNotes?: string;
  repairCost?: number;
  reportedBy?: string;
  assignedTechnicianId?: string | null;
  assignedTechnician?: AssignedTechnician;
  tasks?: TechnicianTask[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIncidentDto {
  title: string;
  description?: string;
  gateId: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  reportedBy?: string;
  repairCost?: number;
  assignedTechnicianId?: string;
}
