'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { decodeToken } from '@/lib/auth-utils';

export function Header() {
  const { token, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };

  if (!token) {
    return null;
  }

  const decodedToken = decodeToken(token);
  if (!decodedToken) {
    logout();
    router.push('/login');
    return null;
  }
  const fullname = decodedToken.fullname || "Usuario";
  const email = decodedToken.email || "";
  const role = decodedToken.role || "Rol desconocido";
  const status = decodedToken.status || "Sin estado";
  const two_factor_enabled = decodedToken.two_factor_enabled || false;

  const initials = fullname
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColor = decodedToken.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500';

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">VirtualMed</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info and Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://avatar.vercel.sh/${email}`} />
                  <AvatarFallback className="bg-blue-500 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Status indicator */}
                <div
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusColor}`}
                />
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-gray-900">{fullname}</p>
                <p className="text-xs text-gray-500">{role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User Info Section */}
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold text-gray-900">{fullname}</p>
              <p className="text-xs text-gray-500">{email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${statusColor}`}
                />
                <span className="text-xs font-medium text-gray-700">{status}</span>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Menu Items */}
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>

            <DropdownMenuItem onChange={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>

            {two_factor_enabled && (
              <DropdownMenuItem disabled>
                <span className="text-xs text-green-600">✓ 2FA Activado</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
