export enum UserRole {
  PATIENT = 'Patient',
  DOCTOR = 'Doctor',
  ADMIN = 'Admin',
  FAMILY_MEMBER = 'FamilyMember'
}

export enum IdentificationType {
  TI = 'TI',
  CC = 'CC',
  CE = 'CE',
  PASSPORT = 'Passport',
}

export interface User {
  id: string;
  documentNumber: string;
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

// ============================================
// AUTH TYPES
// ============================================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface PatientRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  identificationType: IdentificationType | undefined;
  documentNumber: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  phoneNumber?: string;
  acceptPrivacy: boolean;
  authorizeData: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  requiresTwoFactor?: boolean;
}
