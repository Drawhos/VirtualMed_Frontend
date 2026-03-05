'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  FileText,
  Heart,
  Settings,
  Menu,
  X,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UserRole } from '@/constants/userRole';
import { decodeToken } from '@/lib/auth-utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermissions?: string[];
  roles?: UserRole[];
}

export function Sidebar() {
  const { token, logout } = useAuthStore();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!token) {
    return null;
  }

  const decodedToken = decodeToken(token);
  if (!decodedToken) {
    logout();
    router.push('/login');
    return null;
  }
  const role = decodedToken.role || "Rol desconocido";
  const status = decodedToken.status || "Sin estado";
  const permission = decodedToken.permission || [];

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const isDoctorRole = role === UserRole.DOCTOR;
    const isPatientRole = role === UserRole.PATIENT;

    const commonItems: NavItem[] = [
      {
        label: 'Citas',
        href: '/dashboard/appointments',
        icon: Calendar,
        requiredPermissions: ['Appointment:Read'],
      },
    ];

    const doctorItems: NavItem[] = [
      {
        label: 'Pacientes',
        href: '/dashboard/patients',
        icon: Users,
        requiredPermissions: ['Patient:Read'],
      },
      {
        label: 'Encuentros Clínicos',
        href: '/dashboard/clinical-encounters',
        icon: Stethoscope,
        requiredPermissions: ['ClinicalEncounter:Read'],
      },
      {
        label: 'Prescripciones',
        href: '/dashboard/prescriptions',
        icon: FileText,
        requiredPermissions: ['Prescription:Read'],
      },
    ];

    const patientItems: NavItem[] = [
      {
        label: 'Historial Médico',
        href: '/dashboard/medical-history',
        icon: FileText,
        requiredPermissions: ['ClinicalEncounter:Read'],
      },
      {
        label: 'Métricas Vitales',
        href: '/dashboard/vital-metrics',
        icon: Heart,
        requiredPermissions: ['VitalMetric:Read'],
      },
    ];

    const settingsItems: NavItem[] = [
      {
        label: 'Configuración',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ];

    let items = [...commonItems];

    if (isDoctorRole) {
      items = [...items, ...doctorItems];
    } else if (isPatientRole) {
      items = [...items, ...patientItems];
    }

    items = [...items, ...settingsItems];

    return items;
  };

  const hasPermission = (requiredPermissions?: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    return requiredPermissions.some((permission) =>
      permission.includes(permission)
    );
  };

  const navItems = getNavItems().filter((item) => hasPermission(item.requiredPermissions));

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed left-0 top-0 z-40 m-4 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding Section */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-blue-600">VirtualMed</h2>
          <p className="text-xs text-gray-500">{role}</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors duration-200 ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
                {active && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Role Badge */}
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
            <p className="text-xs font-medium text-blue-700">
              {status === 'Active' ? '✓ Verificado' : '⏳ Pendiente'}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
