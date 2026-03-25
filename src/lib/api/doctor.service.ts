// src/lib/api/doctor.service.ts
import apiClient from './axios';
import { Appointment, AppointmentResponse, DoctorResponse, Doctor, AppointmentGetResponse } from '@/types';

export const doctorService = {
    getDoctor: async (doctorId: string): Promise<DoctorResponse> => {
        const response = await apiClient.get<DoctorResponse>(`/doctors/${doctorId}`);
        return response.data;
    },
    getDoctors: async (): Promise<Doctor[]> => {
        const response = await apiClient.get<Doctor[]>('/doctors');
        return response.data;
    },
    createAppointment: async (data: Appointment): Promise<AppointmentResponse> => {
        const response = await apiClient.post<AppointmentResponse>('/appointments', data);
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
        const response = await apiClient.put<AppointmentResponse>(`/appointments/${appointmentId}`, data);
    }
}