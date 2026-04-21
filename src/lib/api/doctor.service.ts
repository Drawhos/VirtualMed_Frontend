// src/lib/api/doctor.service.ts
import { EncounterType } from '@/constants/encounterType';
import apiClient from './axios';
import { Appointment, AppointmentResponse, DoctorResponse, AppointmentGetResponse, 
    DoctorSearch, ClinicalEncounter, ClinicalEncounterResponse, Prescription, 
    DetailedClinicalEncounter } from '@/types';

export const doctorService = {
    // DOCTORES
    getDoctor: async (doctorId: string): Promise<DoctorResponse> => {
        const response = await apiClient.get<DoctorResponse>(`/doctors/${doctorId}`);
        return response.data;
    },
    getDoctors: async (filters: {
        q?: string;
        page?: string;
    }): Promise<DoctorSearch> => {
        const response = await apiClient.get<DoctorSearch>('/Doctors/search', { params: filters });
        return response.data;
    },
    // CITAS
    createAppointment: async (data: Appointment): Promise<AppointmentResponse> => {
        const response = await apiClient.post<AppointmentResponse>('/appointments', data);
        return response.data;
    },
    getAppointment: async (appointmentId: string): Promise<AppointmentGetResponse> => {
        const response = await apiClient.get<AppointmentGetResponse>(`/appointments/${appointmentId}`);
        return response.data;
    },
    getAppointments: async (filters: {
        patientId?: string;
        doctorId?: string;
        from?: string;
        to?: string;
    }): Promise<AppointmentGetResponse[]> => {
        const response = await apiClient.get<AppointmentGetResponse[]>(`/appointments`, { params: filters });
        return response.data;
    },
    updateAppointment: async (appointmentId: string, data: Partial<Appointment>): Promise<void> => {
        await apiClient.put<AppointmentResponse>(`/appointments/${appointmentId}`, data);
    },
    // ENCUENTROS CLÍNICOS
    createClinicalEncounter: async (data: ClinicalEncounter): Promise<ClinicalEncounterResponse> => {
        const response = await apiClient.post<ClinicalEncounterResponse>('/clinical-encounters', data);
        return response.data;
    },
    createPrescription: async (data: Prescription): Promise<void> => {
        const response = await apiClient.post('/prescriptions', data);
        return response.data;
    },
    getClinicalEncounter: async (filters: {
        patientId?: string;
        doctorId?: string;
        from?: string;
        to?: string;
        encounterType?: EncounterType;
    }): Promise<DetailedClinicalEncounter[]> => {
        const response = await apiClient.get<DetailedClinicalEncounter[]>(`/clinical-encounters`, { params: filters });
        return response.data;
    },
    getDetailedClinicalEncounter: async (clinicalEncounterId: string): Promise<DetailedClinicalEncounter> => {
        const response = await apiClient.get<DetailedClinicalEncounter>(`/clinical-encounters/${clinicalEncounterId}`);
        return response.data;
    }
}
