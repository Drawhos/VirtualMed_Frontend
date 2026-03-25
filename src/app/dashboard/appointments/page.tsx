"use client";

import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/constants/userRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ListAppointmentsComponent from "@/components/appointments/appointmentGet";

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Validar que solo doctores y admins accedan
  useEffect(() => {
    if (
      user &&
      user.role !== UserRole.DOCTOR &&
      user.role !== UserRole.ADMIN
    ) {
      router.push("/dashboard/patient");
    }
  }, [user, router]);

  // Si no es doctor ni admin, no renderizar
  if (user && user.role !== UserRole.DOCTOR && user.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ListAppointmentsComponent />
    </div>
  );
}
