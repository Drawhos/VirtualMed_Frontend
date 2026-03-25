// src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { decodeToken } from '@/lib/auth-utils';
import { User } from '@/types';
import { UserRole } from "@/constants/userRole";
import { UserStatus } from '@/constants/userStatus';

const TOKEN_COOKIE = 'token';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const ONE_MONTH = 60 * 60 * 24 * 30;

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  setHasHydrated: (state: boolean) => void;
  setToken: (token: string, expiresIn: number) => User;
  setRefreshToken: (refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // Solo guarda en cookie — el middleware la leerá desde ahí.
      // Cuando el backend implemente HttpOnly, elimina esta función
      // ya que la cookie vendrá automáticamente del servidor.
      setToken: (token: string, expiresIn: number) => {
        const decoded = decodeToken(token); // decodifica aquí, una sola vez

        if (!decoded) throw new Error('Token inválido');

        const user: User = {
          sub: decoded.sub!,
          email: decoded.email!,
          role: decoded.role as UserRole,
          fullname: decoded.fullname!,
          status: decoded.status as UserStatus.ACTIVE | UserStatus.PENDING | UserStatus.INACTIVE,
          email_verified: decoded.email_verified ?? false,
          two_factor_enabled: decoded.two_factor_enabled ?? false,
          permission: decoded.permission ?? [],
        };

        setCookie(TOKEN_COOKIE, token, expiresIn);
        set({ user, isAuthenticated: true, isLoading: false });

        return user;
      },

      setRefreshToken: (refreshToken) => {
        setCookie(REFRESH_TOKEN_COOKIE, refreshToken, ONE_MONTH);
      },

      logout: () => {
        deleteCookie(TOKEN_COOKIE);
        deleteCookie(REFRESH_TOKEN_COOKIE);
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true); // Marca cuando Zustand terminó de hidratar
      },
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          // En SSR retorna un storage vacío que no hace nada
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
