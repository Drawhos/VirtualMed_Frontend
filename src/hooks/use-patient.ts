// src/hooks/usePatient.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '@/lib/api/patient.service';
import { Patient } from '@/types';

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientService.getProfile(patientId),
    enabled: !!patientId,
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: Partial<Patient> }) =>
      patientService.updateProfile(patientId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
    },
  });
}
