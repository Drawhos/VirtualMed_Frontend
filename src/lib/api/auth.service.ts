// src/lib/api/auth.service.ts
import apiClient from './axios';
import { AuthResponse, LoginRequest, PatientRegisterRequest, DoctorResponse, DoctorRegisterRequest, Enable2FAResponse, Verify2FARequest } from '@/types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  registerPacient: async (data: PatientRegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register/patient', data);
    return response.data;
  },

  registerDoctor: async (data: DoctorRegisterRequest): Promise<AuthResponse> => {
    const response = await CreateFormData(data);
    return response.data;
  },

  getDoctor: async (doctorId: string): Promise<DoctorResponse> => {
    const response = await apiClient.get<DoctorResponse>(`/doctors/${doctorId}`);
    return response.data;
  },
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },
  enable2FA: async (): Promise<Enable2FAResponse> => {
    const response = await apiClient.post<Enable2FAResponse>(
      '/auth/2fa/enable'
    );
    return response.data;
  },

  verify2FA: async (data: Verify2FARequest): Promise<void> => {
    await apiClient.post('/auth/2fa/verify', data);
  },
};

// Construir FormData para registro de doctor con archivo adjunto
async function CreateFormData(data: DoctorRegisterRequest) {
  const formData = new FormData();
  formData.append('fullName', data.fullName);
  formData.append('email', data.email);
  formData.append('password', data.password);
  formData.append('professionalLicense', data.professionalLicense);
  formData.append('specialty', data.specialty);
  if (data.supportingDocument) {
    formData.append('supportingDocument', data.supportingDocument);
  }
  const response = await apiClient.post<AuthResponse>(
    '/auth/register/doctor',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response;
}
