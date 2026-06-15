export type TechnicianSpecialization = 'hardware' | 'software' | 'network' | 'electrical' | 'general';
export type TechnicianStatus         = 'active' | 'inactive' | 'on_leave';

export interface Technician {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  specialization: TechnicianSpecialization;
  monthlySalary: number;
  status: TechnicianStatus;
  hireDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTechnicianDto {
  fullName: string;
  email?: string;
  phone?: string;
  specialization?: TechnicianSpecialization;
  monthlySalary: number;
  status?: TechnicianStatus;
  hireDate?: string;
  notes?: string;
}
