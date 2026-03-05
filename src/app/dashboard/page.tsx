'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/userRole';
import { Skeleton } from '@/components/ui/skeleton';
import { decodeToken } from '@/lib/auth-utils';
import { toast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading } = useAuthStore();

  useEffect(() => {

    // If no user is authenticated, redirect to login
    if (!token) {
      router.push('/login');
      return;
    }

    // Decode token to get user role and status
    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      let errorMessage = "Parece que tu sesión ha expirado. Por favor, inicia sesión nuevamente.";
      toast({
        title: "Inicia sesión nuevamente",
        description: errorMessage,
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    // Redirect to role-specific dashboard
    if (decodedToken.role === UserRole.DOCTOR) {
      router.push('/dashboard/doctor');
    } else if (decodedToken.role === UserRole.PATIENT) {
      router.push('/dashboard/patient');
    } else {
      // Fallback for other roles (Admin, FamilyMember, etc.)
      router.push('/dashboard/doctor');
    }
  }, [token, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading || !token) {
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
