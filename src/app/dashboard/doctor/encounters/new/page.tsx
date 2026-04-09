'use client';

import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/userRole';
import { ExaminationForm } from '@/components/clinicalEncounters/examinationForm';

export default function CreateEncounterPage() {
  const { user } = useAuthStore();

  // Si no es doctor, no renderizar
  if (user && user.role !== UserRole.DOCTOR) {
    return null;
  }

  return <ExaminationForm />;
}
