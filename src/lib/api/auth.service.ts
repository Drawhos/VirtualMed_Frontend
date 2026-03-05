// src/lib/api/auth.service.ts
import apiClient from './axios';
import { AuthResponse, AuthResponseWith2FA, LoginRequest, PatientRegisterRequest, DoctorResponse, DoctorRegisterRequest } from '@/types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse | AuthResponseWith2FA> => {
    const response = await apiClient.post<AuthResponse | AuthResponseWith2FA>('/auth/login', credentials);
    return response.data;
  },

  registerPacient: async (data: PatientRegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/Patients', data);
    return response.data;
  },

  registerDoctor: async (data: DoctorRegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/Auth/register/doctor", data);
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
};