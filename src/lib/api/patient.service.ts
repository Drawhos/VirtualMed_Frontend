// src/lib/api/patient.service.ts
import apiClient from './axios';
import { Patient, PatientSearch} from '@/types';

export const patientService = {
  getProfile: async (patientId: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/patients/${patientId}`);
    return response.data;
  },

  updateProfile: async (patientId: string, data: Partial<Patient>): Promise<Patient> => {
    const response = await apiClient.put<Patient>(`/patients/${patientId}`, data);
    return response.data;
  },

  getPatient: async (patientId: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/Patients/${patientId}`);
    return response.data;
  },

  getPatients: async (filters: {
        q?: string;
        page?: string;
    }, options?: { signal?: AbortSignal }): Promise<PatientSearch> => {
    const response = await apiClient.get<PatientSearch>('/Patients/search', { params: filters, signal: options?.signal });
    return response.data;
  }
};
