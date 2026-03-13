'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/userRole';
import { Skeleton } from '@/components/ui/skeleton';
import { getCookie } from '@/lib/auth-utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, _hasHydrated } = useAuthStore();
  const hasToken = !!getCookie('token');

  useEffect(() => {
    if (!_hasHydrated) return; // Esperar hidratación
    if (!hasToken || !user) {
      router.push('/login');
      return;
    }

    switch (user.role) {
      case UserRole.DOCTOR:
        router.push('/dashboard/doctor');
        break;
      case UserRole.PATIENT:
        router.push('/dashboard/patient');
        break;
      default:
        // Fallback para otros roles (Admin, FamilyMember, etc.)
        router.push('/login');
    }
  }, [user, isLoading, hasToken, router]);

  if (isLoading || !hasToken || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md space-y-4 px-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="pt-4">
            <p className="text-center text-sm text-gray-500">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}