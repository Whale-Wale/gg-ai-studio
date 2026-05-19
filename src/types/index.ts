
export type UserRole = 'PlatformAdmin' | 'Professional' | 'User';
export type PlanType = 'Basic' | 'Premium';
export type PatientStatus = 'Normal' | 'Critical' | 'Discharged';

export interface Tenant {
  id: string;
  name: string;
  plan: PlanType;
  status: 'Active' | 'Inactive';
  userCount: number;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  patientId?: string;
  avatarUrl?: string;
}

export interface Patient {
  id: string;
  tenantId: string;
  name: string;
  dob: string;
  status: PatientStatus;
  professionalId: string;
  lastSyncAt?: any;
}

export interface HealthRecord {
  id: string;
  patientId: string;
  tenantId: string;
  heartRate: number;
  steps: number;
  sleepQuality: string;
  timestamp: any;
}

export interface HealthAlert {
  id: string;
  patientId: string;
  patientName?: string;
  tenantId: string;
  heartRate: number;
  timestamp: any;
  status: 'New' | 'Read';
}

export interface AISummary {
  id: string;
  patientId: string;
  tenantId: string;
  summary: string;
  risks: string[];
  recommendations: string[];
  timestamp: any;
}
