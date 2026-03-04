// src/lib/api/patient.service.ts
import apiClient from './axios';
import { Patient} from '@/types';

export const patientService = {
  getProfile: async (patientId: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/patients/${patientId}`);
    return response.data;
  },

  updateProfile: async (patientId: string, data: Partial<Patient>): Promise<Patient> => {
    const response = await apiClient.put<Patient>(`/patients/${patientId}`, data);
    return response.data;
  }
};