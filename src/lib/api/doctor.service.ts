// src/lib/api/doctor.service.ts
import apiClient from './axios';
import { Appointment, AppointmentResponse, DoctorResponse, AppointmentGetResponse, DoctorSearch, ClinicalEncounter, ClinicalEncounterResponse, Prescription } from '@/types';

export const doctorService = {
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
    createAppointment: async (data: Appointment): Promise<AppointmentResponse> => {
        const response = await apiClient.post<AppointmentResponse>('/appointments', data);
        return response.data;
    },
    getApppointment: async (appointmentId: string): Promise<AppointmentGetResponse> => {
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
    createClinicalEncounter: async (data: ClinicalEncounter): Promise<ClinicalEncounterResponse> => {
        const response = await apiClient.post<ClinicalEncounterResponse>('/clinical-encounters', data);
        console.log('Respuesta del backend al crear registro clínico:', response.data);
        return response.data;
    },
    createPrescription: async (data: Prescription): Promise<void> => {
        const response = await apiClient.post('/prescriptions', data);
        console.log('Respuesta del backend al crear prescripción:', response.data);
        return response.data;
    }
}
