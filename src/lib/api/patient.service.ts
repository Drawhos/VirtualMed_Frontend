// src/lib/api/patient.service.ts
import apiClient from './axios';
import { Patient, PatientDetail, PatientSearch } from '@/types';

export const patientService = {
  getProfile: async (patientId: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/patients/${patientId}`);
    return response.data;
  },

  updateProfile: async (patientId: string, data: Partial<Patient>): Promise<Patient> => {
    const response = await apiClient.put<Patient>(`/patients/${patientId}`, data);
    return response.data;
  },

  getPatient: async (patientId: string): Promise<PatientDetail> => {
    const response = await apiClient.get<PatientDetail>(`/Patients/${patientId}`);
    return response.data;
  },

  getPatients: async (filters: {
    q?: string;
    page?: string | number;
    pageSize?: string | number;
    }, options?: { signal?: AbortSignal }): Promise<PatientSearch> => {
    const response = await apiClient.get<PatientSearch>('/Patients/search', {
      params: {
        q: filters.q ?? '',
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
      signal: options?.signal,
    });

    return {
      ...response.data,
      items: response.data.items.map((patient) => ({
        ...patient,
        fullName: patient.fullName || patient.fullname || '',
      })),
    };
  },

  exportPatientHistoryFhir: async (patientId: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/Patients/${patientId}/export/fhir`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportPatientHistoryPdf: async (patientId: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/Patients/${patientId}/export/history/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }
};
