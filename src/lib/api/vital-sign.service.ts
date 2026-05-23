import apiClient from './axios';
import {
  VitalReadingInput,
  VitalReadingsBatchRequest,
  VitalReadingsResponse,
  VitalReadingsSyncRequest,
} from '@/types';

export interface VitalReadingsQueryParams {
  fromUtc?: string;
  toUtc?: string;
  types?: string[];
  source?: 'Manual' | 'Simulated';
  page?: number;
  pageSize?: number;
  includeSummary?: boolean;
}

export const vitalSignService = {
  getMyVitalReadings: async (params: VitalReadingsQueryParams = {}): Promise<VitalReadingsResponse> => {
    const response = await apiClient.get<VitalReadingsResponse>('/Patients/me/vital-readings', {
      params: {
        ...params,
        types: params.types?.length ? params.types : undefined,
      },
    });

    return response.data;
  },

  getPatientVitalReadings: async (
    patientId: string,
    params: VitalReadingsQueryParams = {}
  ): Promise<VitalReadingsResponse> => {
    const response = await apiClient.get<VitalReadingsResponse>(`/Patients/${patientId}/vital-readings`, {
      params: {
        ...params,
        types: params.types?.length ? params.types : undefined,
      },
    });

    return response.data;
  },

  recordMyVitalReadings: async (readings: VitalReadingInput[]): Promise<{ createdCount: number; readingIds: string[] }> => {
    const response = await apiClient.post<{ createdCount: number; readingIds: string[] }>(
      '/Patients/me/vital-readings',
      { readings } satisfies VitalReadingsBatchRequest
    );

    return response.data;
  },

  recordPatientVitalReadings: async (
    patientId: string,
    readings: VitalReadingInput[]
  ): Promise<{ createdCount: number; readingIds: string[] }> => {
    const response = await apiClient.post<{ createdCount: number; readingIds: string[] }>(
      `/Patients/${patientId}/vital-readings`,
      { readings } satisfies VitalReadingsBatchRequest
    );

    return response.data;
  },

  syncSimulatedReadings: async (payload: VitalReadingsSyncRequest): Promise<unknown> => {
    const response = await apiClient.post('/wearables/simulated/sync', payload);
    return response.data;
  },
};
