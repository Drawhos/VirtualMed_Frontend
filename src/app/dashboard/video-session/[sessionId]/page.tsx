"use client";

import { VideoCallRoom } from "@/components/video-session/VideoCallRoom";
import { UserRole } from "@/constants/userRole";
import { useAuthStore } from "@/store/auth.store";

interface VideoSessionPageProps {
  params: {
    sessionId: string;
  };
}

export default function VideoSessionPage({ params }: VideoSessionPageProps) {
  const { user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated || !user) return null;

  const role = user.role === UserRole.PATIENT ? "patient" : "doctor";

  return <VideoCallRoom sessionId={params.sessionId} role={role} />;
}
