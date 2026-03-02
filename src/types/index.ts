export enum UserRole {
  PATIENT = 'Patient',
  DOCTOR = 'Doctor',
  ADMIN = 'Admin',
  FAMILY_MEMBER = 'FamilyMember'
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PATIENT TYPES
// ============================================
export interface Patient extends User {
  document: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: EmergencyContact;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

// ============================================
// DOCTOR TYPES
// ============================================
export interface Doctor extends User {
  professionalLicense: string;
  consultationFee: number;
  languages: string[];
  biography?: string;
  rating?: number;
  totalConsultations?: number;
  verified: boolean;
}
