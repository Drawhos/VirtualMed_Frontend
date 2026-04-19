'use client';

import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/userRole';
import { PrescriptionForm } from '@/components/clinicalEncounters/prescriptionForm';

export default function PrescriptionsPage() {
  const { user } = useAuthStore();

  // Si no es doctor, no renderizar
  if (user && user.role !== UserRole.DOCTOR) {
    return null;
  }

  return <PrescriptionForm />;
}
