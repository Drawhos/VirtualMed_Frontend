import { API_URL } from "./env"

export const API_ROUTES = {
    AUTH: {
        LOGIN: `${API_URL}/auth/login`,
        DOCTOR_REGISTER: `${API_URL}/auth/register/doctor`,
    },
    DOCTORS: {
        PROFILE: (id: string) => `${API_URL}/doctors/${id}`,
    },
}