// src/hooks/use-chat-session.ts
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Hook para manejar la sesión del chat
 * Genera un session_id único basado en el ID del paciente
 */
export function useChatSession() {
  const { user } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.sub) {
      // Crear un session_id basado en el ID del paciente
      // Formato: patient_<patient_id>_<timestamp>
      // O simplemente usar el patient_id como session_id
      setSessionId(user.sub);
    }
  }, [user?.sub]);

  return { sessionId };
}
