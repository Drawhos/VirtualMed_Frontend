import { AppointmentStatus } from "@/constants/appointmentStatus";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeSpaces(str: string) {
  return str.trim().replace(/\s+/g, " ");
}

// ============================================
// Obtener color de badge según estado
// ============================================
export const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return "outline";
    case AppointmentStatus.CONFIRMED:
      return "secondary";
    case AppointmentStatus.INPROGRESS:
      return "default";
    case AppointmentStatus.COMPLETED:
      return "secondary";
    case AppointmentStatus.CANCELLED:
      return "destructive";
    default:
      return "outline";
  }
};

// ============================================
// Obtener nombre de badge según estado
// ============================================
export const getStatusBadgeName = (status: string): string => {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return "Programado";
    case AppointmentStatus.CONFIRMED:
      return "Confirmado";
    case AppointmentStatus.INPROGRESS:
      return "En curso";
    case AppointmentStatus.COMPLETED:
      return "Completado";
    case AppointmentStatus.CANCELLED:
      return "Cancelado";
    default:
      return status;
  }
};
