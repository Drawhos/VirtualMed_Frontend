import { UserRole } from "../constants/userRole";
import { IdentificationType } from "../constants/identificationType";
import { AppointmentStatus } from "@/constants/appointmentStatus";
import { UserStatus } from "@/constants/userStatus";
import { PatientGender } from "@/constants/patientGender";
import { DiagnosisType } from "@/constants/diagnosisType";
import { EncounterType } from "@/constants/encounterType";

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

export interface PatientSearchItem {
  id: string;
  fullName: string;
  document: string;
  // Compatibilidad con backend que pueda retornar camelCase o lowercase
  fullname?: string;
}

export interface PatientSearch {
  items: PatientSearchItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PatientDetail {
  id: string;
  userId: string;
  identificationType: string;
  document: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  allergies: string;
  phoneNumber: string;
  acceptPrivacy: boolean;
  authorizeData: boolean;
}

export interface DoctorSearch {
  items: [
    {
      id: string,
      fullName: string,
      professionalLicense: string
    }
  ],
  page: number,
  pageSize: number,
  totalCount: number
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
  doctorFullName: string;
  patientFullName: string;
  scheduledAt: string;
  durationMinutes: number;
  reason: string | null;
  status: AppointmentStatus;
  hasClinicalEncounter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentResponse {
  appointmentId: string;
}

// AUDIT LOG TYPES
// ============================================
export type AuditOperationCode = 'I' | 'U' | 'D';

export interface AuditLog {
  occurredAt: string;
  tableName: string;
  operation: AuditOperationCode | string;
  rowPk: string;
  oldData?: string | null;
  newData?: string | null;
  appUserId?: string | null;
}

export interface AuditLogFilters {
  tableName?: string;
  operation?: AuditOperationCode;
  from?: string;
  to?: string;
}

export interface AuditLogsResponse {
  items: AuditLog[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

// ============================================
// CLINICAL ENCOUNTER TYPES
// ============================================
export interface ClinicalEncounter {
  appointmentId: string;
  encounterType: EncounterType;
  startAt: string;
  endAt: string;
  chiefComplaint: string;
  currentCondition?: string | null;
  physicalExam?: string | null,
  assessment?: string | null,
  plan?: string | null,
  notes?: string | null,
  recordingUrl?: string | null,
  diagnoses: Array<{
    icd10Code: string,
    description: string,
    type: DiagnosisType
  }>
}

export interface ClinicalEncounterResponse {
  id: string;  
}

export interface Prescription {
  encounterId: string,
  issuedAt: string,
  validUntil: string,
  doctorSignatureHash?: string | null,
  lines: Array<{
      medicationId?: string | null, // El ID del medicamento se asignará en el backend
      medicationName: string,
      dosage: string,
      frequency: string,
      durationDays: number,
      instructions?: string | null
    }>
}
