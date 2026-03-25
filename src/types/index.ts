import { UserRole } from "../constants/userRole";
import { IdentificationType } from "../constants/identificationType";
import { AppointmentStatus } from "@/constants/appointmentStatus";
import { UserStatus } from "@/constants/userStatus";
import { PatientGender } from "@/constants/patientGender";

export interface User {
  sub: string;
  email: string;
  role: UserRole;
  fullname: string;
  status: UserStatus;
  email_verified: boolean;
  two_factor_enabled: boolean;
  permission: string[];
  // Legacy fields for compatibility
  firstName?: string;
  lastName?: string;
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
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  identificationType: IdentificationType | undefined;
  document: string;
  dateOfBirth: string;
  gender: PatientGender;
  phoneNumber?: string;
  acceptPrivacy: boolean;
  authorizeData: boolean;
}

export interface PatientRegisterResponse {
  patientId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthResponseWith2FA {
  requiresTwoFactor: boolean;
  tempTwoFactorToken: string;
}

export interface Login2FARequest {
  code: string;
  tempTwoFactorToken: string;
}

export interface DoctorRegisterRequest {
  fullName: string;
  email: string;
  password: string;
  professionalLicense: string;
  specialty: string;
  supportingDocument: File | null;
}

export interface DoctorResponse {
  doctorId: string;
}

// ============================================
// 2FA TYPES
// ============================================
export interface Enable2FAResponse {
  otpauthUri: string;
  secret: string;
  recoveryCodes: string[];
}

export interface Verify2FARequest {
  code: string;
}

// ============================================
// APPOINTMENT TYPES
// ============================================
export interface Appointment {
  patientId: string;
  doctorId: string | null; // Puede ser null, el backend asignará el doctor basado en el token
  scheduledAt: string;
  durationMinutes: number;
  reason: string | null;
  status: AppointmentStatus;
}

export interface AppointmentGetResponse {
  id: string;
  patientId: string;
  doctorId: string | null; // Puede ser null, el backend asignará el doctor basado en el token
  scheduledAt: string;
  durationMinutes: number;
  reason: string | null;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentResponse {
  appointmentId: string;
}
